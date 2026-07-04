import { useMemo, useState } from "react";

import type { AccountApplication } from "../../shared/accountRegistration";
import { formatDateTime } from "../utils/format";

interface AccountApplicationsPanelProps {
  applications: AccountApplication[];
  saving: boolean;
  onApprove: (
    applicationId: string,
    canUsePopPlacement: boolean,
    canUseTradeFeatures: boolean,
  ) => Promise<boolean>;
  onReject: (applicationId: string) => Promise<boolean>;
}

function statusLabel(status: AccountApplication["status"]): string {
  if (status === "pending") return "承認待ち";
  if (status === "rejected") return "却下";
  return "承認済み";
}

export function AccountApplicationsPanel({
  applications,
  saving,
  onApprove,
  onReject,
}: AccountApplicationsPanelProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [popPlacementDraft, setPopPlacementDraft] = useState<Record<string, boolean>>({});
  const [tradeFeaturesDraft, setTradeFeaturesDraft] = useState<Record<string, boolean>>({});

  const pending = useMemo(
    () => applications.filter((application) => application.status === "pending"),
    [applications],
  );
  const rejected = useMemo(
    () => applications.filter((application) => application.status === "rejected"),
    [applications],
  );

  const handleApprove = async (applicationId: string) => {
    setMessage(null);
    const canUsePopPlacement = popPlacementDraft[applicationId] === true;
    const canUseTradeFeatures = tradeFeaturesDraft[applicationId] === true;
    const ok = await onApprove(applicationId, canUsePopPlacement, canUseTradeFeatures);
    setMessage(ok ? "申請を承認しました" : "承認に失敗しました");
  };

  const handleReject = async (applicationId: string) => {
    setMessage(null);
    const ok = await onReject(applicationId);
    setMessage(ok ? "申請を却下しました" : "却下に失敗しました");
  };

  const renderApplicationFeatureToggles = (applicationId: string) => (
    <>
      <label className="admin-application-list__checkbox">
        <input
          type="checkbox"
          checked={popPlacementDraft[applicationId] === true}
          onChange={(event) =>
            setPopPlacementDraft((current) => ({
              ...current,
              [applicationId]: event.target.checked,
            }))
          }
        />
        POP配置
      </label>
      <label className="admin-application-list__checkbox">
        <input
          type="checkbox"
          checked={tradeFeaturesDraft[applicationId] === true}
          onChange={(event) =>
            setTradeFeaturesDraft((current) => ({
              ...current,
              [applicationId]: event.target.checked,
            }))
          }
        />
        トレード機能
      </label>
    </>
  );

  return (
    <>
      <section className="admin-tools__card admin-tools__card--wide">
        <h3 className="admin-tools__card-title">アカウント申請（承認待ち）</h3>
        {pending.length === 0 ? (
          <p className="admin-tools__muted">承認待ちの申請はありません。</p>
        ) : (
          <ul className="admin-application-list">
            {pending.map((application) => (
              <li key={application.id} className="admin-application-list__item">
                <div className="admin-application-list__main">
                  <strong>{application.displayName}</strong>
                  <span className="admin-application-list__meta">
                    ID: {application.desiredUsername} / {application.position}
                    {application.store ? ` / ${application.store}` : ""}
                  </span>
                  <span className="admin-application-list__meta">
                    申請: {formatDateTime(new Date(application.submittedAt))}
                    {" / "}
                    管理者連絡: {application.contactedAdmin ? "はい" : "いいえ"}
                  </span>
                </div>
                <div className="admin-application-list__actions">
                  {renderApplicationFeatureToggles(application.id)}
                  <button
                    type="button"
                    className="btn btn--primary"
                    disabled={saving}
                    onClick={() => void handleApprove(application.id)}
                  >
                    許可
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary"
                    disabled={saving}
                    onClick={() => void handleReject(application.id)}
                  >
                    却下
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="admin-tools__card admin-tools__card--wide">
        <h3 className="admin-tools__card-title">却下履歴（再許可可）</h3>
        {rejected.length === 0 ? (
          <p className="admin-tools__muted">却下された申請はありません。</p>
        ) : (
          <ul className="admin-application-list">
            {rejected.map((application) => (
              <li key={application.id} className="admin-application-list__item">
                <div className="admin-application-list__main">
                  <strong>{application.displayName}</strong>
                  <span className="admin-application-list__meta">
                    ID: {application.desiredUsername} / {statusLabel(application.status)}
                  </span>
                  {application.rejectedAt && (
                    <span className="admin-application-list__meta">
                      却下: {formatDateTime(new Date(application.rejectedAt))}
                    </span>
                  )}
                </div>
                <div className="admin-application-list__actions">
                  {renderApplicationFeatureToggles(application.id)}
                  <button
                    type="button"
                    className="btn btn--primary"
                    disabled={saving}
                    onClick={() => void handleApprove(application.id)}
                  >
                    再許可
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {message && (
        <p className="admin-tools__status" role="status">
          {message}
        </p>
      )}
    </>
  );
}
