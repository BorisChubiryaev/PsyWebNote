import { TR } from '../utils/tr';
interface Props {
  subtitle?: string;
}

export default function LoadingScreen({ subtitle }: Props) {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col items-center justify-center z-[100]">
      {/* Logo */}
      <div className="relative mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/30 animate-pulse">
          <span className="text-white font-black text-3xl">Ψ</span>
        </div>
        {/* Orbiting dot */}
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '2s' }}>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-purple-400 rounded-full shadow-lg" />
        </div>
      </div>

      {/* Brand name */}
      <h1 className="text-2xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
        PsyWebNote
      </h1>
      <p className="text-gray-400 text-sm mb-10">
        {subtitle ?? TR("Платформа для психологов", "Platform for psychologists")}
      </p>

      {/* Loading bar */}
      <div className="w-48 h-1 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full animate-loading-bar" />
      </div>
      <p className="text-xs text-gray-400 mt-3">{TR("Загружаем ваш профиль...", "Loading your profile...")}</p>

      <style>{`
        @keyframes loading-bar {
          0%   { width: 0%;   margin-left: 0; }
          50%  { width: 70%;  margin-left: 0; }
          75%  { width: 20%;  margin-left: 80%; }
          100% { width: 0%;   margin-left: 100%; }
        }
        .animate-loading-bar {
          animation: loading-bar 1.6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
