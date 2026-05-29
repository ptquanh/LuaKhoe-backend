import { Injectable } from '@nestjs/common';

import {
  DocumentFilterDto,
  SeedNutritionDocDto,
} from '@modules/nutrition/nutrition.dto';
import { NutritionService } from '@modules/nutrition/nutrition.service';

@Injectable()
export class AdminNutritionService {
  constructor(private readonly nutritionService: NutritionService) {}

  async getChunks(query: DocumentFilterDto) {
    return this.nutritionService.getChunks(query);
  }

  async uploadDocument(
    content: string,
    source: string,
    metadata: Record<string, any>,
  ) {
    return this.nutritionService.uploadDocument(content, source, metadata);
  }

  async uploadDocumentFile(file: Express.Multer.File) {
    return this.nutritionService.uploadDocumentFile(file);
  }

  async deleteByID(id: string) {
    return this.nutritionService.deleteByID(id);
  }

  async seedKnowledge(documents: SeedNutritionDocDto[]) {
    return this.nutritionService.seedKnowledge(documents);
  }
}
