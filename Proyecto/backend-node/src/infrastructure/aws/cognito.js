import {
  AdminDeleteUserCommand,
  AdminInitiateAuthCommand,
  AdminRespondToAuthChallengeCommand,
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
  GetUserCommand,
  ResendConfirmationCodeCommand,
  SignUpCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { credencialesDe } from './credenciales.js';

export function createCognito({
  AWS_REGION,
  COGNITO_USER_POOL_ID,
  COGNITO_CLIENT_ID,
  credentials = credencialesDe('COGNITO'),
}) {
  const region = AWS_REGION;
  const userPoolId = COGNITO_USER_POOL_ID;
  const client = new CognitoIdentityProviderClient({ region, credentials });

  return {
    async registrar({ correo, password, nombreCompleto, dpi, fotoPerfilKey }) {
      return client.send(new SignUpCommand({
        ClientId: COGNITO_CLIENT_ID,
        Username: correo,
        Password: password,
        UserAttributes: [
          { Name: 'email', Value: correo },
          { Name: 'name', Value: nombreCompleto },
          { Name: 'custom:dpi', Value: dpi },
          { Name: 'custom:foto_perfil_key', Value: fotoPerfilKey },
        ],
      }));
    },

    async verificar(correo, codigo) {
      return client.send(new ConfirmSignUpCommand({ ClientId: COGNITO_CLIENT_ID, Username: correo, ConfirmationCode: codigo }));
    },

    async reenviarCodigo(correo) {
      return client.send(new ResendConfirmationCodeCommand({ ClientId: COGNITO_CLIENT_ID, Username: correo }));
    },

    async iniciarConPassword(correo, password) {
      return client.send(new AdminInitiateAuthCommand({
        UserPoolId: userPoolId,
        ClientId: COGNITO_CLIENT_ID,
        AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
        AuthParameters: { USERNAME: correo, PASSWORD: password },
      }));
    },

    async iniciarLoginFacial(correo) {
      return client.send(new AdminInitiateAuthCommand({
        UserPoolId: userPoolId,
        ClientId: COGNITO_CLIENT_ID,
        AuthFlow: 'CUSTOM_AUTH',
        AuthParameters: { USERNAME: correo },
      }));
    },

    async responderDesafioFacial({ correo, imagenKey, session }) {
      return client.send(new AdminRespondToAuthChallengeCommand({
        UserPoolId: userPoolId,
        ClientId: COGNITO_CLIENT_ID,
        ChallengeName: 'CUSTOM_CHALLENGE',
        Session: session,
        ChallengeResponses: { USERNAME: correo, ANSWER: imagenKey },
      }));
    },

    async obtenerUsuario(accessToken) {
      return client.send(new GetUserCommand({ AccessToken: accessToken }));
    },

    async eliminarUsuario(correo) {
      return client.send(new AdminDeleteUserCommand({ UserPoolId: userPoolId, Username: correo }));
    },

    async actualizarAtributos(correo, { nombreCompleto, dpi, fotoPerfilKey }) {
      const UserAttributes = [
        { Name: 'name', Value: nombreCompleto },
        { Name: 'custom:dpi', Value: dpi },
      ];
      if (fotoPerfilKey) UserAttributes.push({ Name: 'custom:foto_perfil_key', Value: fotoPerfilKey });
      await client.send(
        new AdminUpdateUserAttributesCommand({
          UserPoolId: userPoolId,
          Username: correo,
          UserAttributes,
        }),
      );
    },
  };
}
