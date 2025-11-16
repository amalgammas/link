import { Module } from '@nestjs/common';
import { LinkModule } from '../link/link.module';
import { TelegramBotService } from './telegram-bot.service';

@Module({
  imports: [LinkModule],
  providers: [TelegramBotService],
})
export class TelegramBotModule {}
