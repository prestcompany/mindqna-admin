import LoginForm from '@/components/page/login/login-form';
import { ShieldCheck } from 'lucide-react';

const LoginPage = () => {
  return (
    <div className='grid min-h-screen w-full bg-white lg:grid-cols-2'>
      <aside className='relative hidden overflow-hidden border-r border-zinc-200 bg-zinc-950 lg:block'>
        <div className='absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_42%)]' />
        <div className='absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.52))]' />
        <div className='relative flex h-full flex-col justify-start p-10 text-zinc-100'>
          <div className='inline-flex w-fit items-center gap-2 rounded-full border border-zinc-700/80 bg-zinc-900/80 px-3 py-1.5 text-sm font-medium'>
            <ShieldCheck className='h-4 w-4' />
            mindBridge Admin
          </div>
        </div>
      </aside>

      <main className='flex items-center justify-center px-5 py-10 sm:px-8'>
        <section className='w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8'>
          <div className='mb-8 space-y-2'>
            <p className='text-sm font-medium text-zinc-500'>mindBridge</p>
            <h2 className='text-3xl font-semibold tracking-tight text-zinc-900'>Admin Login</h2>
            <p className='text-sm text-zinc-500'>관리자 계정으로 로그인해 주세요.</p>
          </div>
          <LoginForm />
          <p className='mt-8 text-center text-xs text-zinc-400'>Protected by mindBridge access policy</p>
        </section>
      </main>
      <div className='pointer-events-none fixed inset-x-0 bottom-0 h-24 bg-gradient-to-t from-zinc-100/60 to-transparent lg:hidden' />
      <div className='pointer-events-none fixed inset-x-0 top-0 h-20 bg-gradient-to-b from-zinc-100/50 to-transparent lg:hidden' />
    </div>
  );
};

export default LoginPage;
