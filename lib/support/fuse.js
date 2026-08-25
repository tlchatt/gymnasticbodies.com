// The 5-minute fuse. Event-driven target: schedule a Google Cloud Task at fire_at that POSTs
// /api/support/fire?fireId=… (cancelled on Undo). Until the Cloud Tasks queue is wired, this is
// a no-op — the fire row is still marked 'scheduled' with fire_at, so it can be fired by a
// manual POST to /api/support/fire or a fallback sweep. Swap the body for the real Cloud Tasks
// call (queue name + service-account JWT) to make the fuse fully autonomous.
export async function scheduleFire(fireId, fireAt) {
  if (!process.env.CLOUD_TASKS_QUEUE) {
    console.log(`[fuse] fire ${fireId} scheduled for ${fireAt} (no Cloud Tasks queue configured — fire via /api/support/fire)`);
    return { scheduled: false, reason: 'no CLOUD_TASKS_QUEUE' };
  }
  // TODO: create a Cloud Task (queue=CLOUD_TASKS_QUEUE) with scheduleTime=fireAt, httpRequest ->
  // `${SUPPORT_PUBLIC_URL}/api/support/fire` body {fireId}. Auth via the technologic service account.
  return { scheduled: true };
}
