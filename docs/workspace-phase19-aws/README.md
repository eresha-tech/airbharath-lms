# Nonproduction Workspace media: review before applying

These files are proposed configuration, not applied changes. No credentials are included.

Confirmed on 2 November 2026 after the founder applied settings: the dedicated target passes read-only public-access-block, versioning, AES256 encryption, local CORS and active queue checks. The agent applied no IAM or bucket changes. These prerequisite checks alone do not establish successful uploads or playback. Do not change existing LMS resources or its identity.

Dedicated target: bucket **airbharath-workspace-uat-dev01**, account **137068239266**, region **ap-south-1**. Queue: `arn:aws:mediaconvert:ap-south-1:137068239266:queues/Default`. Processing role: `arn:aws:iam::137068239266:role/LMSMediaConvertTestRole`.

1. In this account, confirm the bucket exists, is a dedicated NONPRODUCTION general-purpose bucket, and is owned by this account. Correct the Workspace env identifiers if ownership differs. If it does not exist, stop for founder approval before creating it. The existing queue requires no new queue creation.
2. On the dedicated Workspace application identity, review/attach application-policy.json. It grants no object deletion, IAM administration, bucket creation or bucket-configuration writes. It permits GetJob for this account/region; the application additionally checks exact queue/role/job/source metadata. Do not attach it to the LMS identity.
3. On the dedicated processing role only, review mediaconvert-trust.json and mediaconvert-role-policy.json. Do not replace a shared or LMS role policy.
4. If the dedicated test bucket lacks the required settings, review the bucket JSON files: all public access blocked, versioning enabled, default AES256, PUT CORS only from http://localhost:3000. Apply only to this exact bucket, with expected-owner 137068239266. Do not relax public access. No retention/deletion policy is proposed.
5. Re-run `node scripts/workspace-media-preflight.cjs`. All checks must pass before genuine upload/processing tests. Upload and a short test transcode incur normal test usage charges, but this preparation creates no paid infrastructure.

No IAM/bucket mutation has been executed. The current credentials do not establish permission to administer IAM or bucket configuration. The founder may approve these exact changes or apply them personally in the test account.

Primary references: [MediaConvert actions/resources](https://docs.aws.amazon.com/service-authorization/latest/reference/list_mediaconvert.html), [MediaConvert service role](https://docs.aws.amazon.com/mediaconvert/latest/ug/iam-role.html), [S3 API permissions](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-policy-actions.html).
