export type Player = {
  id: string;
  name: string;
  clan?: string;
};

export type Match = {
  id: string;
  date: string;
  players: Player[];
  winnerId: string;
};

export type ActivityStats = {
  playerId: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  lastActive: string;
}; 