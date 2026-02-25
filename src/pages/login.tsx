import GradientBg from '@/components/page/login/gradient-bg';
import LoginForm from '@/components/page/login/login-form';
import { Verified } from 'lucide-react';

const LoginPage = () => {
  return (
    <div className='flex min-h-screen bg-white items-centerw-full'>
      <div className={`hidden relative w-1/2 lg:block`}>
        <GradientBg className='absolute top-0 left-0 w-full h-full' />
        <div className='inline-flex absolute bottom-5 left-5 gap-1 items-center px-3 py-2 font-semibold text-white rounded-lg border-2 border-white'>
          <Verified width={18} height={18} />
          mindBridge
        </div>
      </div>

      <div className='w-full lg:w-1/2'>
        <div className='flex relative justify-center items-center h-full'>
          <section className='px-5 pb-10 w-full text-gray-800 sm:w-4/6 md:w-3/6 lg:w-4/6 xl:w-3/6 sm:px-0'>
            <div className='flex flex-col justify-center items-center px-2 mt-8 sm:mt-0'>
              <h2 className='mt-2 text-4xl font-bold tracking-tight leading-tight'>mindBridge</h2>
              <div className='mt-1 text-base text-muted-foreground'>Admin System</div>
            </div>

            <div className='px-2 mt-12 w-full sm:px-6'>
              <LoginForm />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
