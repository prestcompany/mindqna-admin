import client from "./@base";
import { SpaceType } from "./types";

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
  users: number;
  spaces: number;
  profiles: number;
};
