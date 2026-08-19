import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";

export type DataRequestKind = "access" | "correction" | "deletion";
export type DataRequestStatus = "pending" | "completed" | "rejected";

export type DataRequest = {
  id: string;
  user_id: string | null;
  email: string;
  kind: DataRequestKind;
  details: string | null;
  status: DataRequestStatus;
  resolution_note: string | null;
  ip_hash: string | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
};

export async function createDataRequest(input: {
  user_id: string | null;
  email: string;
  kind: DataRequestKind;
  details: string | null;
  ip_hash: string;
}): Promise<void> {
  const { error } = await supabaseAdmin().from("data_requests").insert(input);
  if (error) throw error;
}

export async function listDataRequests(
  status?: DataRequestStatus,
): Promise<DataRequest[]> {
  let builder = supabaseAdmin()
    .from("data_requests")
    .select("*")
    .order("created_at");
  if (status) builder = builder.eq("status", status);

  const { data, error } = await builder;
  if (error) throw error;
  return data ?? [];
}

export async function getDataRequestById(
  id: string,
): Promise<DataRequest | null> {
  const { data, error } = await supabaseAdmin()
    .from("data_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function resolveDataRequest(
  id: string,
  input: {
    status: Exclude<DataRequestStatus, "pending">;
    note: string | null;
    resolvedBy: string;
  },
): Promise<DataRequest | null> {
  const { data, error } = await supabaseAdmin()
    .from("data_requests")
    .update({
      status: input.status,
      resolution_note: input.note,
      resolved_at: new Date().toISOString(),
      resolved_by: input.resolvedBy,
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}
