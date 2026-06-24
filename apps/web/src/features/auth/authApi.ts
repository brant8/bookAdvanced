import { authStatusSchema, type LoginInput, type RegisterInput } from '@storyverse/contracts';

import { apiRequest } from '../../lib/api';

export const authApi = {
  status: async () => authStatusSchema.parse(await apiRequest('/auth/status')),
  login: async (input: LoginInput) =>
    authStatusSchema.parse(
      await apiRequest('/auth/login', { body: JSON.stringify(input), method: 'POST' }),
    ),
  register: async (input: RegisterInput) =>
    authStatusSchema.parse(
      await apiRequest('/auth/register', { body: JSON.stringify(input), method: 'POST' }),
    ),
};
