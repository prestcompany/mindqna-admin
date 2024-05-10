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
