import { Repository } from 'typeorm';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { DISEASE_STATUS } from '@shared/constants';

import { Disease } from '../disease.entity';

@Injectable()
export class DiseaseSeederService implements OnModuleInit {
  private readonly logger = new Logger(DiseaseSeederService.name);

  constructor(
    @InjectRepository(Disease)
    private readonly diseaseRepo: Repository<Disease>,
  ) {}

  async onModuleInit() {
    await this.seedDiseases();
  }

  private async seedDiseases() {
    // Kiểm tra xem database đã có dữ liệu chưa, nếu có thì bỏ qua để khỏi bị duplicate
    const count = await this.diseaseRepo.count();
    if (count > 0) {
      this.logger.log(
        'Dữ liệu các bệnh lúa đã tồn tại, bỏ qua quá trình seed.',
      );
      return;
    }

    this.logger.log('Bắt đầu seed dữ liệu bệnh lúa...');

    const diseasesToSeed: Partial<Disease>[] = [
      {
        name: 'Bệnh Đạo ôn',
        scientificName: 'Magnaporthe oryzae',
        // Khớp với 'Rice Blast'
        aiClassName: 'Rice Blast',
        signs:
          'Xuất hiện các vết chấm nhỏ màu xanh lục sẫm, sau đó chuyển sang màu nâu xám, có hình mắt én (rộng ở giữa, nhọn hai đầu).',
        status: DISEASE_STATUS.VISIBLE,
        severity: 'high',
        treatment:
          'Ngừng bón phân đạm. Giữ mực nước ruộng ổn định. Phun các loại thuốc đặc trị có hoạt chất Tricyclazole hoặc Isoprothiolane.',
        imageUrl:
          'https://res.cloudinary.com/ptquanh/image/upload/v1779975691/blast-leaf.jpg',
      },
      {
        name: 'Bệnh Bạc lá',
        scientificName: 'Xanthomonas oryzae pv. oryzae',
        // Khớp với 'Bacterial Blight'
        aiClassName: 'Bacterial Blight',
        signs:
          'Vết bệnh bắt đầu từ mép lá hoặc chóp lá, cháy khô dọc theo gân lá, có màu vàng xám hoặc trắng bạc.',
        status: DISEASE_STATUS.VISIBLE,
        severity: 'high',
        treatment:
          'Sử dụng giống lúa kháng bệnh. Rút cạn nước phơi ruộng nếu bệnh trở nặng. Phun các loại thuốc gốc Đồng (Copper) để sát khuẩn.',
        imageUrl:
          'https://res.cloudinary.com/ptquanh/image/upload/v1779975685/bacterial-leaf-blight.jpg',
      },
      {
        name: 'Bệnh Đốm nâu',
        scientificName: 'Bipolaris oryzae',
        // Khớp với 'Brown Spot'
        aiClassName: 'Brown Spot',
        signs:
          'Các vết đốm hình bầu dục hoặc tròn màu nâu trên lá, hạt lúa cũng có thể bị đốm đen ảnh hưởng đến chất lượng gạo.',
        status: DISEASE_STATUS.VISIBLE,
        severity: 'medium',
        treatment:
          'Bổ sung lân và kali cho đất. Giữ đủ nước cho ruộng, tránh để lúa bị khô hạn. Phun thuốc có hoạt chất Propiconazole.',
        imageUrl:
          'https://res.cloudinary.com/ptquanh/image/upload/v1779975685/brown-spot.jpg',
      },
      {
        name: 'Bệnh Tungro (Vàng lụi)',
        scientificName: 'Rice tungro bacilliform virus',
        // Khớp với 'Rice Tungro'
        aiClassName: 'Rice Tungro',
        signs:
          'Cây lúa thấp lùn, đẻ nhánh kém. Lá chuyển sang màu vàng hoặc cam từ chóp lá trở xuống.',
        status: DISEASE_STATUS.VISIBLE,
        severity: 'high',
        treatment:
          'Nhổ bỏ và tiêu hủy cây bệnh. Diệt rầy xanh (vector truyền bệnh) bằng các loại thuốc bảo vệ thực vật phù hợp.',
        imageUrl:
          'https://res.cloudinary.com/ptquanh/image/upload/v1779975685/tungro.jpg',
      },
      {
        name: 'Bệnh Khô vằn',
        scientificName: 'Rhizoctonia solani',
        // Khớp với 'Sheath Blight'
        aiClassName: 'Sheath Blight',
        signs:
          'Vết bệnh xuất hiện trên bẹ lá, ban đầu hình bầu dục màu xanh lục thẫm, sau lan rộng thành dạng vân mây màu xám tro, viền nâu.',
        status: DISEASE_STATUS.VISIBLE,
        severity: 'high',
        treatment:
          'Vệ sinh đồng ruộng, sạ lúa với mật độ vừa phải. Bón phân NPK cân đối. Phun các thuốc có hoạt chất Validamycin, Hexaconazole hoặc Pencycuron khi thấy bệnh chớm xuất hiện.',
        imageUrl:
          'https://res.cloudinary.com/ptquanh/image/upload/v1779975685/sheath-blight.jpg',
      },
    ];

    try {
      // Dùng save để kích hoạt các listener và trigger của TypeORM
      await this.diseaseRepo.save(diseasesToSeed);
      this.logger.log(
        `Đã seed thành công ${diseasesToSeed.length} bệnh lúa vào hệ thống.`,
      );
    } catch (error) {
      this.logger.error(
        'Có lỗi xảy ra trong quá trình seed bệnh lúa:',
        error.message,
      );
    }
  }
}
