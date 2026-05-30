import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';

import { HttpService } from '@nestjs/axios';
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import aiServiceConfig from '@configs/ai-service.config';

import { AiModel } from './ai-model.entity';

// Dynamically require onnxruntime-node to prevent startup errors while it compiles/installs
let ort: any;
try {
  ort = require('onnxruntime-node');
} catch (e) {
  Logger.error('Failed to load onnxruntime-node: ' + e.message, 'AiService');
}

@Injectable()
export class AiService implements OnModuleInit {
  private readonly logger = new Logger(AiService.name);

  // Multi-Session RAM Management and Safe-Guard
  private sessions: Map<string, any> = new Map();
  private sessionQueue: string[] = [];
  private loadingModels: Set<string> = new Set();

  private readonly cacheDir = path.join(process.cwd(), '.models_cache');

  constructor(
    @InjectRepository(AiModel)
    private readonly aiModelRepo: Repository<AiModel>,
    private readonly httpService: HttpService,
    @Inject(aiServiceConfig.KEY)
    private readonly aiConfig: ConfigType<typeof aiServiceConfig>,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing AiService and loading all active models...');
    await this.initActiveModels();
  }

  private async initActiveModels() {
    try {
      const activeModels = await this.aiModelRepo.find({
        where: { isActive: true },
        order: { createdAt: 'DESC' },
      });

      if (activeModels && activeModels.length > 0) {
        this.logger.log(
          `Found ${activeModels.length} active models. Loading concurrently...`,
        );
        // Load active models concurrently
        await Promise.all(
          activeModels.map((model) => this.loadActiveModel(model)),
        );
      } else {
        this.logger.warn('No active models found in the database.');
      }
    } catch (error) {
      this.logger.error('Failed to initialize active models: ' + error.message);
    }
  }

  /**
   * Safely unloads a model session from RAM and V8 garbage collector reference tree
   */
  unloadModel(modelId: string) {
    if (this.sessions.has(modelId)) {
      this.sessions.delete(modelId);
      this.sessionQueue = this.sessionQueue.filter((id) => id !== modelId);
      this.logger.log(
        `[RAM Safe-Guard] Unloaded model ${modelId} from memory.`,
      );
    }
  }

  /**
   * Downloads and creates an ONNX InferenceSession for the target model.
   * Leverages smart local disk caching and strict RAM FIFO eviction safeguard.
   */
  async loadActiveModel(model: AiModel): Promise<void> {
    if (this.loadingModels.has(model.id)) {
      this.logger.warn(
        `Model ${model.versionName} is currently loading/downloading. Rejecting duplicate request.`,
      );
      throw new HttpException(
        'Mô hình này đang được nạp hoặc tải xuống, vui lòng không thực hiện thao tác quá nhanh.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.loadingModels.add(model.id);

    try {
      // 1. Ensure cache directory exists
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }

      // Check if this model is already loaded in RAM
      if (this.sessions.has(model.id)) {
        this.logger.log(
          `Model ${model.versionName} is already loaded in memory.`,
        );
        return;
      }

      const localFilePath = path.join(this.cacheDir, `${model.id}.onnx`);

      // 2. Download ONNX model file ONLY if it does not exist locally
      if (!fs.existsSync(localFilePath)) {
        this.logger.log(
          `Downloading model from ${model.filePath} to ${localFilePath}...`,
        );

        const response = await axios({
          method: 'GET',
          url: model.filePath,
          responseType: 'stream',
        });

        const writer = fs.createWriteStream(localFilePath);
        response.data.pipe(writer);

        await new Promise<void>((resolve, reject) => {
          writer.on('finish', () => resolve());
          writer.on('error', (err) => reject(err));
        });

        this.logger.log(`Download complete for model ${model.versionName}.`);
      } else {
        this.logger.log(
          `Model file already cached locally at ${localFilePath}. Skipping download.`,
        );
      }

      // 3. RAM Safe-Guard Eviction Policy Check right before session creation
      const maxModels = process.env.MAX_CONCURRENT_MODELS
        ? parseInt(process.env.MAX_CONCURRENT_MODELS, 10)
        : 1;

      while (this.sessions.size >= maxModels && this.sessionQueue.length > 0) {
        const oldestModelId = this.sessionQueue.shift();
        if (oldestModelId) {
          this.logger.log(
            `[RAM Safe-Guard] Concurrent limit reached (${maxModels}). Evicting oldest model: ${oldestModelId}`,
          );
          this.unloadModel(oldestModelId);
        }
      }

      this.logger.log(
        `Instantiating ONNX runtime InferenceSession for ${model.versionName}...`,
      );

      // Initialize ONNX InferenceSession
      if (!ort) {
        try {
          ort = require('onnxruntime-node');
        } catch (e) {
          throw new Error(
            'onnxruntime-node is not installed or failed to load: ' + e.message,
          );
        }
      }

      const session = await ort.InferenceSession.create(localFilePath);

      // Store in memory tracking structures
      this.sessions.set(model.id, session);
      this.sessionQueue.push(model.id);

      this.logger.log(
        `ONNX InferenceSession loaded successfully for model: ${model.versionName}`,
      );
    } catch (error) {
      this.logger.error(
        `Error loading model ${model.versionName}: ${error.message}`,
      );
      throw error;
    } finally {
      this.loadingModels.delete(model.id);
    }
  }

  /**
   * Executes inference predict parameters check, acting as a sanity gate.
   * Passes the dynamic prediction details to the FastAPI microservice.
   */
  async predict(
    params: {
      imageUrl: string;
      gpsLat?: number;
      gpsLng?: number;
      province?: string;
      fieldParams?: any;
      weather?: any;
      confidenceThreshold: number;
      modelVersionName: string;
    },
    modelId?: string,
  ): Promise<any> {
    let sessionToUse: any = null;

    if (modelId) {
      sessionToUse = this.sessions.get(modelId);
      if (!sessionToUse) {
        // If not loaded, attempt to load it on-demand
        const dbModel = await this.aiModelRepo.findOne({
          where: { id: modelId },
        });
        if (dbModel) {
          this.logger.log(
            `Model ${modelId} requested but not loaded. Loading on-demand...`,
          );
          await this.loadActiveModel(dbModel);
          sessionToUse = this.sessions.get(modelId);
        }
      }
    } else {
      // Default to the first available loaded session in the Map
      if (this.sessions.size > 0) {
        sessionToUse = this.sessions.values().next().value;
      }
    }

    if (!sessionToUse) {
      this.logger.error('No suitable ONNX InferenceSession found.');
      throw new ServiceUnavailableException(
        'Hệ thống AI hiện đang được bảo trì. Vui lòng thử lại sau.',
      );
    }

    // Call the Python microservice to perform the prediction
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.aiConfig.baseUrl}/predict`, {
          image_url: params.imageUrl,
          gps_lat: params.gpsLat,
          gps_lng: params.gpsLng,
          province: params.province,
          field_params: params.fieldParams,
          weather: params.weather,
          confidence_threshold: params.confidenceThreshold,
          ai_model_version: params.modelVersionName,
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Error calling Python prediction service: ${error.message}`,
      );
      throw error;
    }
  }

  async reScore(params: {
    originalResults: { disease: string; confidence: number }[];
    newImageUrl: string;
    modelVersionName?: string;
  }): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.aiConfig.baseUrl}/re-score`, {
          original_results: params.originalResults.map((r) => ({
            disease: r.disease,
            confidence: r.confidence,
          })),
          new_image_url: params.newImageUrl,
          ai_model_version: params.modelVersionName,
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Error calling Python re-score service: ${error.message}`,
      );
      throw error;
    }
  }
}
