import React from 'react';

interface AvatarProps {
  username: string;
  profileImage?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isOnline?: boolean;
  showOnlineBadge?: boolean;
  className?: string;
}

const sizeMap = {
  xs: { container: 'w-6 h-6', text: 'text-xs', badge: 'w-2 h-2 border' },
  sm: { container: 'w-8 h-8', text: 'text-xs', badge: 'w-2.5 h-2.5 border' },
  md: { container: 'w-10 h-10', text: 'text-sm', badge: 'w-3 h-3 border-2' },
  lg: { container: 'w-14 h-14', text: 'text-lg', badge: 'w-3.5 h-3.5 border-2' },
};

const Avatar: React.FC<AvatarProps> = ({
  username,
  profileImage,
  size = 'sm',
  isOnline,
  showOnlineBadge = false,
  className = '',
}) => {
  const { container, text, badge } = sizeMap[size];
  const initials = (username || '?')[0].toUpperCase();
  const imageUrl = profileImage
    ? (profileImage.startsWith('http') ? profileImage : `http://localhost:8000${profileImage}`)
    : null;

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <div className={`${container} rounded-full overflow-hidden`}>
        {imageUrl ? (
          <img src={imageUrl} alt={username} className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center font-bold text-white ${text}`}>
            {initials}
          </div>
        )}
      </div>
      {showOnlineBadge && (
        <div className={`absolute bottom-0 right-0 ${badge} rounded-full border-slate-950 ${isOnline ? 'bg-green-500' : 'bg-slate-500'}`} />
      )}
    </div>
  );
};

export default Avatar;
