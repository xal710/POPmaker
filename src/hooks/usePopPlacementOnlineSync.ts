import { useEffect } from "react";

import { startAppVersionWatcher } from "../utils/appVersion";
import {
  bindPopPlacementOnlineSync,
  restorePopPlacementOnDeploy,
} from "../utils/popPlacementSync";

export function usePopPlacementOnlineSync(
  username: string | null | undefined,
  canUsePopPlacement: boolean,
): void {
  useEffect(() => {
    if (!username || !canUsePopPlacement) return;
    return bindPopPlacementOnlineSync(username);
  }, [username, canUsePopPlacement]);

  useEffect(() => {
    if (!username || !canUsePopPlacement) return;

    return startAppVersionWatcher(async () => {}, {
      isRefreshing: () => false,
      onDeployDetected: () => {
        void restorePopPlacementOnDeploy();
      },
    });
  }, [username, canUsePopPlacement]);
}
