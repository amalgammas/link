import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import { RoomService } from '../link/room.service';

@Injectable()
export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramBotService.name);
  private bot?: Telegraf;

  constructor(private readonly roomService: RoomService) {}

  async onModuleInit(): Promise<void> {
    const token = process.env.TG_BOT_TOKEN;
    if (!token) {
      this.logger.warn('TG_BOT_TOKEN is not set. Telegram bot will not start.');
      return;
    }

    this.bot = new Telegraf(token);
    this.registerHandlers(this.bot);

    this.bot
      .launch()
      .then(() => this.logger.log('Telegram bot is up and running.'))
      .catch((error) => {
        this.logger.error('Failed to launch Telegram bot', error as Error);
        this.bot = undefined;
      });
  }

  onModuleDestroy(): void {
    if (!this.bot) {
      return;
    }

    this.bot.stop('Nest shutdown');
    this.logger.log('Telegram bot has been stopped.');
    this.bot = undefined;
  }

  private registerHandlers(bot: Telegraf): void {
    bot.start(async (ctx) => {
      await ctx.reply('Привет! Напиши /link, чтобы создать ссылку для звонка.');
    });

    bot.command('link', async (ctx) => {
      try {
        const room = this.roomService.createRoom();
        const baseUrl = process.env.LINK_BASE_URL || 'https://example.com';
        const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const url = `${normalizedBaseUrl}/room/${room.id}`;

        await ctx.reply(`Вот твоя ссылка:\n${url}\n\nПередай её собеседнику, и вы сможете созвониться прямо в браузере.`);
      } catch (error) {
        this.logger.error('Failed to create room for Telegram user', error as Error);
        await ctx.reply('Не удалось создать ссылку, попробуй позже.');
      }
    });
  }
}
