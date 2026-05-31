import * as bcrypt from 'bcrypt';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { UserService } from '@modules/user/services/user.service';

import { ENV_KEY } from '@shared/constants';
import { ROLE } from '@shared/enums';

@Injectable()
export class AdminSeederService implements OnModuleInit {
  private readonly logger = new Logger(AdminSeederService.name);

  constructor(
    private configService: ConfigService,
    private userService: UserService,
  ) {}

  async onModuleInit() {
    await this.seedDefaultAdmin();
  }

  private async seedDefaultAdmin() {
    const email = this.configService.get<string>(ENV_KEY.DEFAULT_ADMIN_EMAIL);
    const password = this.configService.get<string>(
      ENV_KEY.DEFAULT_ADMIN_PASSWORD,
    );

    if (!email || !password) {
      this.logger.warn(
        'Không tìm thấy cấu hình DEFAULT_ADMIN trong .env. Bỏ qua khởi tạo Admin.',
      );
      return;
    }

    const existingAdmin = await this.userService.findOne({ email });
    if (existingAdmin) {
      this.logger.log(
        `Tài khoản Admin mặc định (${email}) đã tồn tại. Bỏ qua khởi tạo.`,
      );
      return;
    }

    this.logger.log(`Đang khởi tạo tài khoản Admin mặc định (${email})...`);

    const hashedPassword = await bcrypt.hash(password, 10);

    await this.userService.create({
      email,
      password: hashedPassword,
      role: ROLE.ADMIN,
    });

    this.logger.log('Khởi tạo Genesis Admin THÀNH CÔNG!');
  }
}
