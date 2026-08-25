import LoginForm from '@/components/page/login/login-form';
import { ShieldCheck } from 'lucide-react';

const LoginPage = () => {
  return (
    <div className='grid min-h-screen w-full bg-white lg:grid-cols-2'>
      <aside className='relative hidden overflow-hidden border-r border-border bg-foreground lg:block'>
        <div className='absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_42%)]' />
        <div className='absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.52))]' />
        <div className='relative flex h-full flex-col justify-start p-10 text-slate-100'>
          <div className='inline-flex w-fit items-center gap-2 rounded-full border border-slate-700/80 bg-foreground/80 px-3 py-1.5 text-sm font-medium'>
            <ShieldCheck className='h-4 w-4' />
            mindBridge Admin
          </div>
        </div>
      </aside>

      <main className='flex items-center justify-center px-5 py-10 sm:px-8'>
        <section className='w-full max-w-md rounded-2xl border border-border bg-white p-6 sm:p-8'>
          <div className='mb-8 space-y-2'>
            <p className='text-sm font-medium text-muted-foreground'>mindBridge</p>
            <h2 className='text-3xl font-semibold tracking-tight text-foreground'>Admin Login</h2>
            <p className='text-sm text-muted-foreground'>관리자 계정으로 로그인해 주세요.</p>
          </div>
          <LoginForm />
          <p className='mt-8 text-center text-xs text-faint'>Protected by mindBridge access policy</p>
        </section>
      </main>
      <div className='pointer-events-none fixed inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-100/60 to-transparent lg:hidden' />
      <div className='pointer-events-none fixed inset-x-0 top-0 h-20 bg-gradient-to-b from-slate-100/50 to-transparent lg:hidden' />
    </div>
  );
};

export default LoginPage;
