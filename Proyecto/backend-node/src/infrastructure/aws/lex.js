import { LexRuntimeV2Client, RecognizeTextCommand } from '@aws-sdk/client-lex-runtime-v2';
import { credencialesDe } from './credenciales.js';

export function createLexBot({ AWS_REGION, LEX_BOT_ID, LEX_BOT_ALIAS_ID, LEX_LOCALE_ID = 'es_US' }) {
  const client = new LexRuntimeV2Client({ region: AWS_REGION, credentials: credencialesDe('LEX') });
  return {
    async reconocerTexto(mensaje, sesionId) {
      return client.send(new RecognizeTextCommand({
        botId: LEX_BOT_ID,
        botAliasId: LEX_BOT_ALIAS_ID,
        localeId: LEX_LOCALE_ID,
        sessionId: sesionId,
        text: mensaje,
      }));
    },
  };
}
