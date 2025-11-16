import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TelegramBotModule } from './telegram-bot/telegram-bot.module';
import { LinkModule } from './link/link.module';

@Module({
  imports: [TelegramBotModule, LinkModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
