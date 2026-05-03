import HeroSection from '../components/HeroSection';
import QuickAccessCards from '../components/QuickAccessCards';
import PollingLocator from '../components/PollingLocator';

export default function Home() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <HeroSection />
      <QuickAccessCards />
      <PollingLocator />
    </div>
  );
}
