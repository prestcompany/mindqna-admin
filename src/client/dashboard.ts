import client from "./@base";
import { Profile, Space, SpaceType, User } from "./types";

export async function getAnalytics(by: {
  startedAt?: string;
  endedAt?: string;
  spaceType?: SpaceType[];
  locale?: string[];
}) {
  const res = await client.get<Result>("/analytics", { params: by });

  return res.data;
}

export async function getAdsTest(by: { startedAt?: string; endedAt?: string }) {
  const res = await client.get<{ userA: number; userB: number }>("/ads", { params: by });

  return res.data;
}

type Result = {
  users: User[];
  spaces: Space[];
  profiles: Profile[];
  total: {
    users: number;
    spaces: number;
    profiles: number;
  };
};
