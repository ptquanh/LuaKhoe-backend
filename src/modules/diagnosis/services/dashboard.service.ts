import { HttpResponse } from 'mvc-common-toolkit';
import { MoreThanOrEqual, Repository } from 'typeorm';

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { NutritionService } from '@modules/nutrition/nutrition.service';
import { UserService } from '@modules/user/services/user.service';

import { ROLE } from '@shared/enums';
import { generateSuccessResult } from '@shared/helpers/operation-result.helper';

import { DiagnosisResult } from '../entities/diagnosis-result.entity';
import { Diagnosis } from '../entities/diagnosis.entity';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectRepository(Diagnosis)
    private readonly diagnosisRepo: Repository<Diagnosis>,
    @InjectRepository(DiagnosisResult)
    private readonly diagnosisResultRepo: Repository<DiagnosisResult>,
    private readonly userService: UserService,
    private readonly nutritionService: NutritionService,
  ) {}

  async getStats(): Promise<HttpResponse<any>> {
    this.logger.log('Calculating dashboard statistics...');

    // 1. Total Farmers
    const totalFarmers = await this.userService.count({ role: ROLE.FARMER });

    // 2. Total Diagnoses
    const totalDiagnoses = await this.diagnosisRepo.count();

    // 3. Diagnoses This Week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const diagnosesThisWeek = await this.diagnosisRepo.count({
      where: {
        createdAt: MoreThanOrEqual(oneWeekAgo),
      },
    });

    // 4. Total RAG Chunks
    const totalRagChunks = await this.nutritionService.count({});

    // 5. Disease Distribution
    const rawDistribution = await this.diagnosisResultRepo
      .createQueryBuilder('result')
      .leftJoin('result.disease', 'disease')
      .select('disease.name', 'name')
      .addSelect('COUNT(result.id)', 'count')
      .where('disease.name IS NOT NULL')
      .groupBy('disease.name')
      .orderBy('count', 'DESC')
      .getRawMany();

    const diseaseDistribution = rawDistribution.map((d) => ({
      name: d.name,
      count: parseInt(d.count, 10),
    }));

    // 6. Recent Diagnoses Activity
    const recentDiagnosesList = await this.diagnosisRepo.find({
      relations: ['user', 'user.farmerProfile', 'results', 'results.disease'],
      order: {
        createdAt: 'DESC',
      },
      take: 8,
    });

    const recentDiagnoses = recentDiagnosesList.map((d) => {
      const profile = d.user?.farmerProfile;
      const farmerName = profile
        ? [profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
          d.user.username
        : d.user?.username || 'Ẩn danh';

      // Sort results by confidence descending to get the primary disease
      const sortedResults = [...(d.results || [])].sort(
        (a, b) => Number(b.confidence) - Number(a.confidence),
      );
      const topResult = sortedResults[0];
      const diseaseName =
        topResult?.disease?.name || 'Lúa khỏe mạnh / Không rõ bệnh';
      const confidence = topResult ? Number(topResult.confidence) : 100.0;

      return {
        id: d.id,
        farmer: farmerName,
        disease: diseaseName,
        confidence,
        time: d.createdAt,
      };
    });

    return generateSuccessResult({
      totalFarmers,
      totalDiagnoses,
      diagnosesThisWeek,
      totalRagChunks,
      diseaseDistribution,
      recentDiagnoses,
    });
  }
}
