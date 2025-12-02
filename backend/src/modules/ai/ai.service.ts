import { Injectable } from '@nestjs/common';

@Injectable()
export class AiService {
  async test() {
    return { ok: true, message: 'AI service is ready for integration.' };
  }
}
