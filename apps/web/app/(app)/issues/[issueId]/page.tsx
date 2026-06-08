import { use } from "react";
import { IssueDetailPage } from "../../../../components/issue/issue-detail-page";

export default function Page({
  params,
}: {
  params: Promise<{ issueId: string }>;
}) {
  const { issueId } = use(params);
  return <IssueDetailPage issueId={issueId} />;
}
