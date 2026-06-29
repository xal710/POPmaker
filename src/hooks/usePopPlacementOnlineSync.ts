import { useEffect } from "react";

import { canUsePopPlacementOnline } from "../../shared/popPlacement";
import { startAppVersionWatcher } from "../utils/appVersion";
import {
  bindPopPlacementOnlineSync,
  restorePopPlacementOnDeploy,
} from "../utils/popPlacementSync";

export function usePopPlacementOnlineSync(username: string | null | undefined): void {
  useEffect(() => {
    if (!canUsePopPlacementOnline(username)) return;
    return bindPopPlacementOnlineSync(username);
  }, [username]);

  useEffect(() => {
    if (!canUsePopPlacementOnline(username)) return;

    return startAppVersionWatcher(async () => {}, {
      isRefreshing: () => false,
      onDeployDetected: () => {
        void restorePopPlacementOnDeploy();
      },
    });
  }, [username]);
}
