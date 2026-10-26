import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';
import { credencialesDe } from './credenciales.js';

export function createTraductor({ AWS_REGION: region, credentials = credencialesDe('TRANSLATE') }) {
  const client = new TranslateClient({ region, credentials });

  return {
    async traducir(texto, idioma) {
      const { TranslatedText, SourceLanguageCode } = await client.send(
        new TranslateTextCommand({ Text: texto, SourceLanguageCode: 'auto', TargetLanguageCode: idioma }),
      );
      return { texto: TranslatedText, idiomaOrigen: SourceLanguageCode };
    },
  };
}
