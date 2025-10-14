import Tabs from '@/components/Tabs';
import CurrentUserSelector from '@/components/CurrentUserSelector';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12 lg:p-24 bg-gray-50">
      <div className="w-full max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold text-gray-800 tracking-tight">
            Kahoot Permission Emulator
          </h1>
        </div>
        <div className="mb-8">
          <CurrentUserSelector />
        </div>
        <div className="bg-white rounded-lg shadow-xl">
          <Tabs />
        </div>
      </div>
    </main>
  );
}