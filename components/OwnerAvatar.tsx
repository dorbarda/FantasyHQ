import Image from 'next/image';
import { teamLogoSrc } from '@/lib/team-logos';
import { getInitials, getOwnerColor } from '@/lib/owner-meta';
import { bestTextOn } from '@/lib/contrast';

/**
 * Owner avatar: the team logo when one exists, otherwise the owner's
 * initials on their identity colour. Replaces the empty grey circles that
 * used to appear for owners without an uploaded logo, so every seat in a
 * matchup reads as a person.
 */
export default function OwnerAvatar({
  ownerName,
  teamName,
  size = 48,
  className = '',
}: {
  ownerName: string;
  teamName: string;
  size?: number;
  className?: string;
}) {
  const logo = teamLogoSrc(teamName);

  if (logo) {
    return (
      <Image
        src={logo}
        alt={teamName}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className={`rounded-full object-cover object-top ${className}`}
      />
    );
  }

  const bg = getOwnerColor(ownerName);
  return (
    <div
      aria-hidden
      title={ownerName}
      style={{
        width: size,
        height: size,
        background: bg,
        color: bestTextOn(bg),
        fontSize: Math.round(size * 0.36),
      }}
      className={`rounded-full flex items-center justify-center font-bold tracking-tight shrink-0 ${className}`}
    >
      {getInitials(ownerName)}
    </div>
  );
}
