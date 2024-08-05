import NextAuth, { Session } from 'next-auth';
import CredentialsProvider, { CredentialsConfig } from 'next-auth/providers/credentials';

const credentialsProviderOption: CredentialsConfig<{}> = {
  type: 'credentials',
  id: 'login-credentials',
  name: 'login-credentials',
  credentials: {
    username: { label: 'Username', type: 'text' },
    password: { label: 'Password', type: 'password' },
  },
  async authorize(credentials: Record<string, string> | undefined) {
    if (!credentials) return;

    return checkAdmin({ username: credentials.username, password: credentials.password });
  },
};

export default NextAuth({
  pages: {
    signIn: '/login',
    verifyRequest: '/login?verify=1',
    error: '/login',
  },
  providers: [CredentialsProvider(credentialsProviderOption)],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = (user as Session['user']).id;
        token.login = (user as Session['user']).login;
      }
      return token;
    },
    session({ session, token }) {
      session.user = { ...session.user, id: token.id as string, login: token.login as string };
      return session;
    },
  },
});

function checkAdmin(by: { username: string; password: string }): User | null {
  let user = null;

  admins.forEach((admin) => {
    if (admin.username === by.username && admin.password === by.password) {
      user = admin;
    }
  });

  return user;
}

const admins: User[] = [{ id: '0', name: 'admin', username: 'admin@admin.com', password: 'rhflffk1!' }];

type User = { id: string; name: string; username: string; password: string };
