import { useMemo, useState } from "react";

import type { AccountApplication } from "../../shared/accountRegistration";
import type { AdminAccountSummary } from "../../shared/admin";
import { formatDateTime } from "../utils/format";

interface AccountApplicationsPanelProps {
  accounts: AdminAccountSummary[];
  applications: AccountApplication[];
  saving: boolean;
  onApprove: (applicationId: string, canUsePopPlacement: boolean) => Promise<boolean>;
  onReject: (applicationId: string) => Promise<boolean>;
  onTogglePopPlacement: (username: string, enabled: boolean) => Promise<boolean>;
}

function statusLabel(status: AccountApplication["status"]): string {
  if (status === "pending") return "承認待ち";
  if (status === "rejected") return "却下";
  return "承認済み";
}

export function AccountApplicationsPanel({
  accounts,
  applications,
  saving,
  onApprove,
  onReject,
  onTogglePopPlacement,
}: AccountApplicationsPanelProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [popPlacementDraft, setPopPlacementDraft] = useState<Record<string, boolean>>({});

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
    const ok = await onApprove(applicationId, canUsePopPlacement);
    setMessage(ok ? "申請を承認しました" : "承認に失敗しました");
  };

  const handleReject = async (applicationId: string) => {
    setMessage(null);
    const ok = await onReject(applicationId);
    setMessage(ok ? "申請を却下しました" : "却下に失敗しました");
  };

  const handleTogglePopPlacement = async (username: string, enabled: boolean) => {
    setMessage(null);
    const ok = await onTogglePopPlacement(username, enabled);
    setMessage(ok ? "POP配置の表示設定を更新しました" : "更新に失敗しました");
  };

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
                  <label className="admin-application-list__checkbox">
                    <input
                      type="checkbox"
                      checked={popPlacementDraft[application.id] === true}
                      onChange={(event) =>
                        setPopPlacementDraft((current) => ({
                          ...current,
                          [application.id]: event.target.checked,
                        }))
                      }
                    />
                    POP配置を表示
                  </label>
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
                  <label className="admin-application-list__checkbox">
                    <input
                      type="checkbox"
                      checked={popPlacementDraft[application.id] === true}
                      onChange={(event) =>
                        setPopPlacementDraft((current) => ({
                          ...current,
                          [application.id]: event.target.checked,
                        }))
                      }
                    />
                    POP配置を表示
                  </label>
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

      <section className="admin-tools__card admin-tools__card--wide">
        <h3 className="admin-tools__card-title">POP配置の表示アカウント</h3>
        <p className="admin-tools__hint">
          チェックを入れたアカウントだけがPOP配置画面と同期機能を利用できます。
        </p>
        <ul className="admin-account-list">
          {accounts.map((account) => (
            <li key={account.username} className="admin-account-list__item">
              <span className="admin-account-list__name">
                {account.displayName ?? account.username}
                <span className="admin-application-list__meta"> ({account.username})</span>
              </span>
              <label className="admin-application-list__checkbox">
                <input
                  type="checkbox"
                  checked={account.canUsePopPlacementOnline}
                  disabled={saving || account.isAdministrator}
                  onChange={(event) =>
                    void handleTogglePopPlacement(account.username, event.target.checked)
                  }
                />
                POP配置
              </label>
            </li>
          ))}
        </ul>
      </section>

      {message && (
        <p className="admin-tools__status" role="status">
          {message}
        </p>
      )}
    </>
  );
}
