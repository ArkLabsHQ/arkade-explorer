import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/UI/Card';
import { FeatureCard } from '../components/Home/FeatureCard';
import { RecentActivity } from '../components/Home/RecentActivity';
import { ParticleRain } from '../components/UI/ParticleRain';
import { Search, Blocks, Wallet, Zap } from 'lucide-react';

export function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [particleTrigger, setParticleTrigger] = useState(0);
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const query = searchQuery.trim();
    
    if (/^[0-9a-fA-F]{64}$/.test(query)) {
      navigate(`/tx/${query}`);
    } else {
      navigate(`/address/${query}`);
    }
    
    setSearchQuery('');
  };

  const handleNewActivity = () => {
    setParticleTrigger(prev => prev + 1);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <ParticleRain trigger={particleTrigger} />
      

      <Card glowing>
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Transaction ID or Address..."
              className="w-full px-4 py-3 bg-arkade-black border-2 border-arkade-purple text-arkade-gray font-mono focus:outline-none focus:border-arkade-orange placeholder-gray-600"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 retro-button"
              aria-label="Search"
            >
              <Search size={20} />
            </button>
          </div>
        </form>
      </Card>

      <RecentActivity onNewActivity={handleNewActivity} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FeatureCard
          icon={Blocks}
          title="Commitment TXs"
          description="On-chain transactions that create batch outputs and VTXO trees for the Arkade protocol."
        />
        <FeatureCard
          icon={Zap}
          title="Arkade TXs"
          description="Off-chain transactions that spend and create VTXOs with instant settlement."
        />
        <FeatureCard
          icon={Wallet}
          title="VTXOs"
          description="Virtual Transaction Outputs enable fast, private Bitcoin transactions without on-chain settlement."
        />
      </div>

      <div className="text-center">
        <a
          href="https://docs.arkadeos.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block retro-button"
        >
          Learn More About Arkade
        </a>
      </div>
    </div>
  );
}
