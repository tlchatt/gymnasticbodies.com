"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var oas_1 = __importDefault(require("oas"));
var core_1 = __importDefault(require("api/dist/core"));
var openapi_json_1 = __importDefault(require("./openapi.json"));
var SDK = /** @class */ (function () {
    function SDK() {
        this.spec = oas_1.default.init(openapi_json_1.default);
        this.core = new core_1.default(this.spec, 'jwp-platform/0.2 (api/6.1.3)');
    }
    /**
     * Optionally configure various options that the SDK allows.
     *
     * @param config Object of supported SDK options and toggles.
     * @param config.timeout Override the default `fetch` request timeout of 30 seconds. This number
     * should be represented in milliseconds.
     */
    SDK.prototype.config = function (config) {
        this.core.setConfig(config);
    };
    /**
     * If the API you're using requires authentication you can supply the required credentials
     * through this method and the library will magically determine how they should be used
     * within your API request.
     *
     * With the exception of OpenID and MutualTLS, it supports all forms of authentication
     * supported by the OpenAPI specification.
     *
     * @example <caption>HTTP Basic auth</caption>
     * sdk.auth('username', 'password');
     *
     * @example <caption>Bearer tokens (HTTP or OAuth 2)</caption>
     * sdk.auth('myBearerToken');
     *
     * @example <caption>API Keys</caption>
     * sdk.auth('myApiKey');
     *
     * @see {@link https://spec.openapis.org/oas/v3.0.3#fixed-fields-22}
     * @see {@link https://spec.openapis.org/oas/v3.1.0#fixed-fields-22}
     * @param values Your auth credentials for the API; can specify up to two strings or numbers.
     */
    SDK.prototype.auth = function () {
        var _a;
        var values = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            values[_i] = arguments[_i];
        }
        (_a = this.core).setAuth.apply(_a, values);
        return this;
    };
    /**
     * If the API you're using offers alternate server URLs, and server variables, you can tell
     * the SDK which one to use with this method. To use it you can supply either one of the
     * server URLs that are contained within the OpenAPI definition (along with any server
     * variables), or you can pass it a fully qualified URL to use (that may or may not exist
     * within the OpenAPI definition).
     *
     * @example <caption>Server URL with server variables</caption>
     * sdk.server('https://{region}.api.example.com/{basePath}', {
     *   name: 'eu',
     *   basePath: 'v14',
     * });
     *
     * @example <caption>Fully qualified server URL</caption>
     * sdk.server('https://eu.api.example.com/v14');
     *
     * @param url Server URL
     * @param variables An object of variables to replace into the server URL.
     */
    SDK.prototype.server = function (url, variables) {
        if (variables === void 0) { variables = {}; }
        this.core.setServer(url, variables);
    };
    /**
     * List player bidding configurations
     *
     * @summary List player bidding configurations
     * @throws FetchError<400, types.GetV2SitesSiteIdAdvertisingPlayerBiddingConfigsResponse400> Invalid JSON request body
     */
    SDK.prototype.getV2SitesSite_idAdvertisingPlayer_bidding_configs = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/advertising/player_bidding_configs/', 'get', metadata);
    };
    SDK.prototype.postV2SitesSite_idAdvertisingPlayer_bidding_configs = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/advertising/player_bidding_configs/', 'post', body, metadata);
    };
    /**
     * Get a player bidding configuration
     *
     * @summary Get a player bidding configuration
     * @throws FetchError<404, types.GetV2SitesSiteIdAdvertisingPlayerBiddingConfigsConfigIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idAdvertisingPlayer_bidding_configsConfig_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/advertising/player_bidding_configs/{config_id}/', 'get', metadata);
    };
    SDK.prototype.patchV2SitesSite_idAdvertisingPlayer_bidding_configsConfig_id = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/advertising/player_bidding_configs/{config_id}/', 'patch', body, metadata);
    };
    /**
     * Delete a player bidding configuration
     *
     * @summary Delete a player bidding configuration
     * @throws FetchError<404, types.DeleteV2SitesSiteIdAdvertisingPlayerBiddingConfigsConfigIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.deleteV2SitesSite_idAdvertisingPlayer_bidding_configsConfig_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/advertising/player_bidding_configs/{config_id}/', 'delete', metadata);
    };
    SDK.prototype.putV2SitesSite_idAdvertisingUpdate_schedules_player_bidding_configs = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/advertising/update_schedules_player_bidding_configs/', 'put', body, metadata);
    };
    /**
     * List advertising schedules
     *
     * @summary List advertising schedules
     * @throws FetchError<400, types.GetV2SitesSiteIdAdvertisingSchedulesResponse400> Invalid JSON request body
     */
    SDK.prototype.getV2SitesSite_idAdvertisingSchedules = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/advertising/schedules/', 'get', metadata);
    };
    SDK.prototype.postV2SitesSite_idAdvertisingSchedules = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/advertising/schedules/', 'post', body, metadata);
    };
    /**
     * Get an advertising schedule
     *
     * @summary Get an advertising schedule
     * @throws FetchError<404, types.GetV2SitesSiteIdAdvertisingSchedulesAdScheduleIdResponse404> Invalid JSON request body
     */
    SDK.prototype.getV2SitesSite_idAdvertisingSchedulesAd_schedule_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/advertising/schedules/{ad_schedule_id}/', 'get', metadata);
    };
    SDK.prototype.patchV2SitesSite_idAdvertisingSchedulesAd_schedule_id = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/advertising/schedules/{ad_schedule_id}/', 'patch', body, metadata);
    };
    /**
     * Delete an advertising schedule
     *
     * @summary Delete an advertising schedule
     * @throws FetchError<404, types.DeleteV2SitesSiteIdAdvertisingSchedulesAdScheduleIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.deleteV2SitesSite_idAdvertisingSchedulesAd_schedule_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/advertising/schedules/{ad_schedule_id}/', 'delete', metadata);
    };
    /**
     * Fetches an analytics report over a custom date range
     *
     * @summary Fetches an analytics report over a custom date range
     */
    SDK.prototype.postV2SitesSite_idAnalyticsQueries = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/analytics/queries/', 'post', body, metadata);
    };
    /**
     * List all app configs for a site
     *
     * @summary List app configs
     */
    SDK.prototype.getV2SitesSite_idApp_configs = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/app_configs/', 'get', metadata);
    };
    SDK.prototype.postV2SitesSite_idApp_configs = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/app_configs/', 'post', body, metadata);
    };
    /**
     * Retrieve the details of a specific app config
     *
     * @summary Get an app config
     */
    SDK.prototype.getV2SitesSite_idApp_configsApp_config_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/app_configs/{app_config_id}/', 'get', metadata);
    };
    /**
     * Delete a specific app config
     *
     * @summary Delete an app config
     */
    SDK.prototype.deleteV2SitesSite_idApp_configsApp_config_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/app_configs/{app_config_id}/', 'delete', metadata);
    };
    SDK.prototype.patchV2SitesSite_idApp_configsApp_config_id = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/app_configs/{app_config_id}/', 'patch', body, metadata);
    };
    /**
     * Retrieves a list of resources that represent the audio renditions created from
     * secondary/alternate audio tracks.
     *
     * @summary List audio renditions
     * @throws FetchError<404, types.GetV2SitesSiteIdMediaMediaIdOriginalsOriginalIdAudioTracksAudioTrackIdAudioRenditionsResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idMediaMedia_idOriginalsOriginal_idAudio_tracksAudio_track_idAudio_renditions = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/originals/{original_id}/audio_tracks/{audio_track_id}/audio_renditions/', 'get', metadata);
    };
    /**
     * Retrieves an audio rendition for any secondary/alternate audio track (any track except
     * for the default audio track). The default/primary audio track rendition can be found on
     * the [media renditions
     * resource](https://docs.jwplayer.com/platform/reference/get_v2-sites-site-id-media-media-id-media-renditions-rendition-id).
     *
     * @summary Get an audio rendition
     * @throws FetchError<404, types.GetV2SitesSiteIdMediaMediaIdOriginalsOriginalIdAudioTracksAudioTrackIdAudioRenditionsRenditionIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idMediaMedia_idOriginalsOriginal_idAudio_tracksAudio_track_idAudio_renditionsRendition_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/originals/{original_id}/audio_tracks/{audio_track_id}/audio_renditions/{rendition_id}/', 'get', metadata);
    };
    /**
     * Retrieves a list of audio tracks associated with the original
     *
     * @summary List audio tracks
     * @throws FetchError<404, types.GetV2SitesSiteIdMediaMediaIdOriginalsOriginalIdAudioTracksResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idMediaMedia_idOriginalsOriginal_idAudio_tracks = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/originals/{original_id}/audio_tracks/', 'get', metadata);
    };
    /**
     * Retrieves the details of a specific audio track
     *
     * @summary Get an audio track
     * @throws FetchError<404, types.GetV2SitesSiteIdMediaMediaIdOriginalsOriginalIdAudioTracksAudioTrackIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idMediaMedia_idOriginalsOriginal_idAudio_tracksAudio_track_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/originals/{original_id}/audio_tracks/{audio_track_id}/', 'get', metadata);
    };
    SDK.prototype.patchV2SitesSite_idMediaMedia_idOriginalsOriginal_idAudio_tracksAudio_track_id = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/originals/{original_id}/audio_tracks/{audio_track_id}/', 'patch', body, metadata);
    };
    /**
     * Deletes a specific audio track resource
     *
     * Deleted audio tracks are **permanently removed** and will not be available for playback.
     *
     * **NOTE**: Default audio tracks **cannot** be deleted.
     *
     * @summary Delete an audio track
     * @throws FetchError<404, types.DeleteV2SitesSiteIdMediaMediaIdOriginalsOriginalIdAudioTracksAudioTrackIdResponse404> Resource with ID supplied does not exist in account and object namespace
     * @throws FetchError<409, types.DeleteV2SitesSiteIdMediaMediaIdOriginalsOriginalIdAudioTracksAudioTrackIdResponse409> Request conflicts with state of target resource
     */
    SDK.prototype.deleteV2SitesSite_idMediaMedia_idOriginalsOriginal_idAudio_tracksAudio_track_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/originals/{original_id}/audio_tracks/{audio_track_id}/', 'delete', metadata);
    };
    /**
     * Create a new live stream
     *
     * For more product information, see [Get started with Broadcast
     * Live](https://docs.jwplayer.com/platform/docs/broadcast-live-get-started-with-broadcast-live).
     *
     * @summary Create a live stream
     * @throws FetchError<400, types.PostV2SitesSiteIdLiveBroadcastStreamsResponse400> Invalid JSON request body
     * @throws FetchError<422, types.PostV2SitesSiteIdLiveBroadcastStreamsResponse422> Unprocessable Filter Parameters
     */
    SDK.prototype.postV2SitesSite_idLiveBroadcastStreams = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/live/broadcast/streams/', 'post', body, metadata);
    };
    /**
     * List all Broadcast Live streams for a site
     *
     * @summary List Broadcast Live streams
     * @throws FetchError<422, types.GetV2SitesSiteIdLiveBroadcastStreamsResponse422> Unprocessable Filter Parameters
     * @throws FetchError<502, types.GetV2SitesSiteIdLiveBroadcastStreamsResponse502> A lower level service failed to process request.
     */
    SDK.prototype.getV2SitesSite_idLiveBroadcastStreams = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/live/broadcast/streams/', 'get', metadata);
    };
    /**
     * Start a live stream
     *
     * The request is always accepted, but only executed when the live stream is in a state
     * that can be started.
     *
     * @summary Start a live stream
     * @throws FetchError<400, types.PutV2SitesSiteIdLiveBroadcastStreamsStreamIdStartResponse400> Invalid JSON request body
     */
    SDK.prototype.putV2SitesSite_idLiveBroadcastStreamsStream_idStart = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/live/broadcast/streams/{stream_id}/start/', 'put', metadata);
    };
    /**
     * Make a live stream available
     *
     * The request is always accepted, but only executed when the live stream is in a state
     * that can be made available.
     *
     * @summary Start a live stream
     * @throws FetchError<400, types.PutV2SitesSiteIdLiveBroadcastStreamsStreamIdGoLiveResponse400> Invalid JSON request body
     */
    SDK.prototype.putV2SitesSite_idLiveBroadcastStreamsStream_idGo_live = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/live/broadcast/streams/{stream_id}/go_live/', 'put', metadata);
    };
    /**
     * Stop a live stream
     *
     * The request is always accepted but only executed when the live stream is in a state that
     * can be stopped.
     *
     * @summary Stop a live stream
     * @throws FetchError<400, types.PutV2SitesSiteIdLiveBroadcastStreamsStreamIdStopResponse400> Invalid JSON request body
     */
    SDK.prototype.putV2SitesSite_idLiveBroadcastStreamsStream_idStop = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/live/broadcast/streams/{stream_id}/stop/', 'put', metadata);
    };
    /**
     * Remove the stream infrastructure and delete the live stream
     *
     * The system stops any ongoing processes and tears down the infrastructure.
     *
     * For the duration of the process, the live stream will be in a `Destroying` state. This
     * process can take up to 15 minutes to complete. At the end of the process, the live
     * stream will be deleted.
     *
     * @summary Destroy a live stream
     * @throws FetchError<400, types.PutV2SitesSiteIdLiveBroadcastStreamsStreamIdDestroyResponse400> Invalid JSON request body
     */
    SDK.prototype.putV2SitesSite_idLiveBroadcastStreamsStream_idDestroy = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/live/broadcast/streams/{stream_id}/destroy/', 'put', metadata);
    };
    SDK.prototype.putV2SitesSite_idLiveBroadcastStreamsStream_idSet_ingest = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/live/broadcast/streams/{stream_id}/set_ingest/', 'put', body, metadata);
    };
    SDK.prototype.putV2SitesSite_idLiveBroadcastStreamsStream_idRemove_ingest = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/live/broadcast/streams/{stream_id}/remove_ingest/', 'put', body, metadata);
    };
    SDK.prototype.patchV2SitesSite_idLiveBroadcastStreamsStream_id = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/live/broadcast/streams/{stream_id}/', 'patch', body, metadata);
    };
    /**
     * Retrieve the details of a specific live stream
     *
     * @summary Get a live stream
     * @throws FetchError<404, types.GetV2SitesSiteIdLiveBroadcastStreamsStreamIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idLiveBroadcastStreamsStream_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/live/broadcast/streams/{stream_id}/', 'get', metadata);
    };
    /**
     * Create a new media object that is a subsection of an existing media
     *
     * @summary Create a clip
     * @throws FetchError<400, types.PutV2SitesSiteIdLiveBroadcastStreamsMediaIdClipResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PutV2SitesSiteIdLiveBroadcastStreamsMediaIdClipResponse404> Resource with ID supplied does not exist in account and object namespace
     * @throws FetchError<502, types.PutV2SitesSiteIdLiveBroadcastStreamsMediaIdClipResponse502> A lower level service failed to process request.
     */
    SDK.prototype.putV2SitesSite_idLiveBroadcastStreamsMedia_idClip = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/live/broadcast/streams/{media_id}/clip/', 'put', body, metadata);
    };
    /**
     * List all Broadcast stream configs for a site
     *
     * @summary List Broadcast stream configs
     * @throws FetchError<422, types.GetV2SitesSiteIdLiveBroadcastStreamConfigsResponse422> Unprocessable Filter Parameters
     * @throws FetchError<502, types.GetV2SitesSiteIdLiveBroadcastStreamConfigsResponse502> A lower level service failed to process request.
     */
    SDK.prototype.getV2SitesSite_idLiveBroadcastStream_configs = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/live/broadcast/stream_configs/', 'get', metadata);
    };
    /**
     * Retrieve the details of a specific stream config
     *
     * @summary Get a stream config
     * @throws FetchError<404, types.GetV2SitesSiteIdLiveBroadcastStreamConfigsConfigIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idLiveBroadcastStream_configsConfig_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/live/broadcast/stream_configs/{config_id}/', 'get', metadata);
    };
    /**
     * Retrieve the details of a default stream config
     *
     * A single default config can exist per site and is not returned in other queries.
     *
     * @summary Get the default stream config for a site
     * @throws FetchError<404, types.GetV2SitesSiteIdLiveBroadcastStreamConfigsDefaultResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idLiveBroadcastStream_configsDefault = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/live/broadcast/stream_configs/default/', 'get', metadata);
    };
    /**
     * List all Broadcast Live ingest points for a site
     *
     * @summary List Broadcast Live ingest points
     * @throws FetchError<422, types.GetV2SitesSiteIdLiveBroadcastIngestResponse422> Unprocessable Filter Parameters
     * @throws FetchError<502, types.GetV2SitesSiteIdLiveBroadcastIngestResponse502> A lower level service failed to process request.
     */
    SDK.prototype.getV2SitesSite_idLiveBroadcastIngest = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/live/broadcast/ingest/', 'get', metadata);
    };
    /**
     * Create a new live ingest point
     *
     * For more product information, see [Get started with Broadcast
     * Live](https://docs.jwplayer.com/platform/docs/broadcast-live-get-started-with-broadcast-live).
     *
     * @summary Create a live ingest point
     * @throws FetchError<400, types.PostV2SitesSiteIdLiveBroadcastIngestResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PostV2SitesSiteIdLiveBroadcastIngestResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.postV2SitesSite_idLiveBroadcastIngest = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/live/broadcast/ingest/', 'post', body, metadata);
    };
    /**
     * List the availabilities of Broadcast Live ingest points for a specific format between
     * two dates
     *
     * @summary List ingest point availability
     * @throws FetchError<400, types.GetV2SitesSiteIdLiveBroadcastIngestAvailabilityResponse400> Invalid JSON request body
     * @throws FetchError<404, types.GetV2SitesSiteIdLiveBroadcastIngestAvailabilityResponse404> Resource with ID supplied does not exist in account and object namespace
     * @throws FetchError<502, types.GetV2SitesSiteIdLiveBroadcastIngestAvailabilityResponse502> A lower level service failed to process request.
     */
    SDK.prototype.getV2SitesSite_idLiveBroadcastIngestAvailability = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/live/broadcast/ingest/availability/', 'get', metadata);
    };
    /**
     * Retrieve the details of a specific live ingest point
     *
     * @summary Get a live ingest point
     * @throws FetchError<404, types.GetV2SitesSiteIdLiveBroadcastIngestIngestIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idLiveBroadcastIngestIngest_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/live/broadcast/ingest/{ingest_id}/', 'get', metadata);
    };
    /**
     * Deletes a specific live ingest point if not in use or scheduled to be used
     *
     * @summary Delete a live ingest point
     * @throws FetchError<404, types.DeleteV2SitesSiteIdLiveBroadcastIngestIngestIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.deleteV2SitesSite_idLiveBroadcastIngestIngest_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/live/broadcast/ingest/{ingest_id}/', 'delete', metadata);
    };
    /**
     * Update the display name of a specific live ingest point
     *
     * @summary Update the display name of a live ingest point
     * @throws FetchError<400, types.PatchV2SitesSiteIdLiveBroadcastIngestIngestIdResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PatchV2SitesSiteIdLiveBroadcastIngestIngestIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.patchV2SitesSite_idLiveBroadcastIngestIngest_id = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/live/broadcast/ingest/{ingest_id}/', 'patch', body, metadata);
    };
    /**
     * List all Broadcast Live streams for a live ingest point
     *
     * @summary List streams for an ingest point
     * @throws FetchError<422, types.GetV2SitesSiteIdLiveBroadcastIngestIngestIdStreamsResponse422> Unprocessable Filter Parameters
     * @throws FetchError<502, types.GetV2SitesSiteIdLiveBroadcastIngestIngestIdStreamsResponse502> A lower level service failed to process request.
     */
    SDK.prototype.getV2SitesSite_idLiveBroadcastIngestIngest_idStreams = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/live/broadcast/ingest/{ingest_id}/streams/', 'get', metadata);
    };
    SDK.prototype.postV2SitesSite_idLiveBroadcastSecrets = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/live/broadcast/secrets/', 'post', body, metadata);
    };
    /**
     * List all secrets for a site
     *
     * Each secret represents a passphrase or key used for securing live streams.
     *
     * @summary List secrets
     * @throws FetchError<404, types.GetV2SitesSiteIdLiveBroadcastSecretsResponse404> Resource with ID supplied does not exist in account and object namespace
     * @throws FetchError<500, types.GetV2SitesSiteIdLiveBroadcastSecretsResponse500> Internal server error
     */
    SDK.prototype.getV2SitesSite_idLiveBroadcastSecrets = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/live/broadcast/secrets/', 'get', metadata);
    };
    /**
     * Retrieve the details of a specific secret
     *
     * A secret represents a passphrase or key used for securing live streams.
     *
     * @summary Get a secret
     * @throws FetchError<404, types.GetV2SitesSiteIdLiveBroadcastSecretsSecretIdResponse404> Resource with ID supplied does not exist in account and object namespace
     * @throws FetchError<500, types.GetV2SitesSiteIdLiveBroadcastSecretsSecretIdResponse500> Internal server error
     */
    SDK.prototype.getV2SitesSite_idLiveBroadcastSecretsSecret_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/live/broadcast/secrets/{secret_id}/', 'get', metadata);
    };
    SDK.prototype.patchV2SitesSite_idLiveBroadcastSecretsSecret_id = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/live/broadcast/secrets/{secret_id}/', 'patch', body, metadata);
    };
    /**
     * Delete a secret by its ID
     *
     * Note: Secrets cannot be deleted while in use by active or scheduled LiveStreams.
     *
     * @summary Delete a secret
     * @throws FetchError<400, types.DeleteV2SitesSiteIdLiveBroadcastSecretsSecretIdResponse400> Invalid JSON request body
     * @throws FetchError<404, types.DeleteV2SitesSiteIdLiveBroadcastSecretsSecretIdResponse404> Resource with ID supplied does not exist in account and object namespace
     * @throws FetchError<500, types.DeleteV2SitesSiteIdLiveBroadcastSecretsSecretIdResponse500> Internal server error
     */
    SDK.prototype.deleteV2SitesSite_idLiveBroadcastSecretsSecret_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/live/broadcast/secrets/{secret_id}/', 'delete', metadata);
    };
    /**
     * List all content type schemas for a site
     *
     * Content types streamline the tasks of content editors, like managing media metadata, by
     * automatically displaying the necessary fields in the JWX dashboard. This applies to
     * various content types such as concerts, teams, matches, venues, and more.
     *
     * @summary List schemas
     */
    SDK.prototype.getV2SitesSite_idContent_type_schemas = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/content_type_schemas/', 'get', metadata);
    };
    /**
     * Create a new schema for a site
     *
     * @summary Create schema
     */
    SDK.prototype.postV2SitesSite_idContent_type_schemas = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/content_type_schemas/', 'post', body, metadata);
    };
    /**
     * Delete a specific schema
     *
     * @summary Delete a schema
     */
    SDK.prototype.deleteV2SitesSite_idContent_type_schemasSchema_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/content_type_schemas/{schema_id}/', 'delete', metadata);
    };
    /**
     * Retrieve the details of a specific schema
     *
     * @summary Get a schema
     */
    SDK.prototype.getV2SitesSite_idContent_type_schemasSchema_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/content_type_schemas/{schema_id}/', 'get', metadata);
    };
    /**
     * Update a specific schema
     *
     * @summary Update a schema
     */
    SDK.prototype.patchV2SitesSite_idContent_type_schemasSchema_id = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/content_type_schemas/{schema_id}/', 'patch', body, metadata);
    };
    /**
     * Retrieves a list of custom audio renditions
     *
     * @summary Retrieve list of custom audio renditions
     */
    SDK.prototype.getV2SitesSite_idMediaMedia_idCustom_audio_renditions = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/custom_audio_renditions/', 'get', metadata);
    };
    SDK.prototype.postV2SitesSite_idMediaMedia_idCustom_audio_renditions = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/custom_audio_renditions/', 'post', body, metadata);
    };
    /**
     * Retrieves a custom audio rendition
     *
     * @summary Retrieve a custom audio rendition
     * @throws FetchError<404, types.GetV2SitesSiteIdMediaMediaIdCustomAudioRenditionsRenditionIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idMediaMedia_idCustom_audio_renditionsRendition_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/custom_audio_renditions/{rendition_id}/', 'get', metadata);
    };
    SDK.prototype.patchV2SitesSite_idMediaMedia_idCustom_audio_renditionsRendition_id = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/custom_audio_renditions/{rendition_id}/', 'patch', body, metadata);
    };
    /**
     * Deletes a custom audio rendition resource by ID
     *
     * @summary Delete a custom audio rendition
     * @throws FetchError<404, types.DeleteV2SitesSiteIdMediaMediaIdCustomAudioRenditionsRenditionIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.deleteV2SitesSite_idMediaMedia_idCustom_audio_renditionsRendition_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/custom_audio_renditions/{rendition_id}/', 'delete', metadata);
    };
    /**
     * Retrieves a list of custom text renditions
     *
     * @summary Retrieve list of custom text renditions
     */
    SDK.prototype.getV2SitesSite_idMediaMedia_idCustom_text_renditions = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/custom_text_renditions/', 'get', metadata);
    };
    SDK.prototype.postV2SitesSite_idMediaMedia_idCustom_text_renditions = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/custom_text_renditions/', 'post', body, metadata);
    };
    /**
     * Retrieves a custom text rendition
     *
     * @summary Retrieve a custom text rendition
     * @throws FetchError<404, types.GetV2SitesSiteIdMediaMediaIdCustomTextRenditionsRenditionIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idMediaMedia_idCustom_text_renditionsRendition_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/custom_text_renditions/{rendition_id}/', 'get', metadata);
    };
    SDK.prototype.patchV2SitesSite_idMediaMedia_idCustom_text_renditionsRendition_id = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/custom_text_renditions/{rendition_id}/', 'patch', body, metadata);
    };
    /**
     * Deletes a custom text rendition resource by ID
     *
     * @summary Delete a custom text rendition
     * @throws FetchError<404, types.DeleteV2SitesSiteIdMediaMediaIdCustomTextRenditionsRenditionIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.deleteV2SitesSite_idMediaMedia_idCustom_text_renditionsRendition_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/custom_text_renditions/{rendition_id}/', 'delete', metadata);
    };
    /**
     * Retrieves a list of custom video renditions
     *
     * @summary Retrieve list of custom video renditions
     */
    SDK.prototype.getV2SitesSite_idMediaMedia_idCustom_video_renditions = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/custom_video_renditions/', 'get', metadata);
    };
    SDK.prototype.postV2SitesSite_idMediaMedia_idCustom_video_renditions = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/custom_video_renditions/', 'post', body, metadata);
    };
    /**
     * Retrieves a custom video rendition
     *
     * @summary Retrieve a custom video rendition
     * @throws FetchError<404, types.GetV2SitesSiteIdMediaMediaIdCustomVideoRenditionsRenditionIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idMediaMedia_idCustom_video_renditionsRendition_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/custom_video_renditions/{rendition_id}/', 'get', metadata);
    };
    /**
     * Deletes a custom video rendition resource by ID
     *
     * @summary Delete a custom video rendition
     * @throws FetchError<404, types.DeleteV2SitesSiteIdMediaMediaIdCustomVideoRenditionsRenditionIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.deleteV2SitesSite_idMediaMedia_idCustom_video_renditionsRendition_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/custom_video_renditions/{rendition_id}/', 'delete', metadata);
    };
    SDK.prototype.postV2SitesSite_idDrm_policies = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/drm_policies/', 'post', body, metadata);
    };
    /**
     * Lists DRM policies for a site
     *
     * @summary List DRM policies
     * @throws FetchError<400, types.GetV2SitesSiteIdDrmPoliciesResponse400> Invalid JSON request body
     */
    SDK.prototype.getV2SitesSite_idDrm_policies = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/drm_policies/', 'get', metadata);
    };
    /**
     * Fetches DRM policy details
     *
     * @summary Get a DRM policy
     * @throws FetchError<404, types.GetV2SitesSiteIdDrmPoliciesPolicyIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idDrm_policiesPolicy_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/drm_policies/{policy_id}/', 'get', metadata);
    };
    SDK.prototype.patchV2SitesSite_idDrm_policiesPolicy_id = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/drm_policies/{policy_id}/', 'patch', body, metadata);
    };
    /**
     * Delete a given DRM policy
     *
     * @summary Delete a DRM policy
     * @throws FetchError<404, types.DeleteV2SitesSiteIdDrmPoliciesPolicyIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.deleteV2SitesSite_idDrm_policiesPolicy_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/drm_policies/{policy_id}/', 'delete', metadata);
    };
    SDK.prototype.postV2SitesSite_idMediaMedia_idImages = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/images/', 'post', body, metadata);
    };
    /**
     * Get a list of all images for this media
     *
     * @summary List additional images for media
     */
    SDK.prototype.getV2SitesSite_idMediaMedia_idImages = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/images/', 'get', metadata);
    };
    /**
     * Request details for an image resource with a specific image ID
     *
     * @summary Get an additional image
     */
    SDK.prototype.getV2SitesSite_idMediaMedia_idImagesImage_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/images/{image_id}/', 'get', metadata);
    };
    SDK.prototype.patchV2SitesSite_idMediaMedia_idImagesImage_id = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/images/{image_id}/', 'patch', body, metadata);
    };
    /**
     * Delete an image resource with a specific image ID
     *
     * @summary Delete an additional image
     */
    SDK.prototype.deleteV2SitesSite_idMediaMedia_idImagesImage_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/images/{image_id}/', 'delete', metadata);
    };
    /**
     * List MRSS import sources
     *
     * @summary List imports
     * @throws FetchError<400, types.GetV2SitesSiteIdImportsResponse400> Invalid JSON request body
     */
    SDK.prototype.getV2SitesSite_idImports = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/imports/', 'get', metadata);
    };
    SDK.prototype.postV2SitesSite_idImports = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/imports/', 'post', body, metadata);
    };
    /**
     * Get MRSS import source
     *
     * @summary Get an import
     * @throws FetchError<400, types.GetV2SitesSiteIdImportsImportIdResponse400> Invalid JSON request body
     * @throws FetchError<404, types.GetV2SitesSiteIdImportsImportIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idImportsImport_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/imports/{import_id}/', 'get', metadata);
    };
    SDK.prototype.patchV2SitesSite_idImportsImport_id = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/imports/{import_id}/', 'patch', body, metadata);
    };
    /**
     * Delete MRSS import source
     *
     * @summary Delete an import
     * @throws FetchError<404, types.DeleteV2SitesSiteIdImportsImportIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.deleteV2SitesSite_idImportsImport_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/imports/{import_id}/', 'delete', metadata);
    };
    /**
     * Get a list of all live channels
     *
     * @summary List live channels
     * @throws FetchError<400, types.GetV2SitesSiteIdChannelsResponse400> Invalid JSON request body
     */
    SDK.prototype.getV2SitesSite_idChannels = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/channels/', 'get', metadata);
    };
    SDK.prototype.postV2SitesSite_idChannels = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/channels/', 'post', body, metadata);
    };
    /**
     * Get a live channel
     *
     * @summary Get a live channel
     * @throws FetchError<404, types.GetV2SitesSiteIdChannelsChannelIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idChannelsChannel_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/channels/{channel_id}/', 'get', metadata);
    };
    /**
     * Delete a live channel
     *
     * @summary Delete a live channel
     * @throws FetchError<404, types.DeleteV2SitesSiteIdChannelsChannelIdResponse404> Resource with ID supplied does not exist in account and object namespace
     * @throws FetchError<409, types.DeleteV2SitesSiteIdChannelsChannelIdResponse409> Request conflicts with state of target resource
     */
    SDK.prototype.deleteV2SitesSite_idChannelsChannel_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/channels/{channel_id}/', 'delete', metadata);
    };
    SDK.prototype.patchV2SitesSite_idChannelsChannel_id = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/channels/{channel_id}/', 'patch', body, metadata);
    };
    /**
     * Disables the channel and makes it unavailable for ingest and playback.
     *
     * @summary Disable the channel
     * @throws FetchError<404, types.PutV2SitesSiteIdChannelsChannelIdDisableResponse404> Invalid JSON request body
     */
    SDK.prototype.putV2SitesSite_idChannelsChannel_idDisable = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/channels/{channel_id}/disable/', 'put', metadata);
    };
    /**
     * Enables the channels and makes it available for ingest and playback.
     *
     * @summary Enable the channel
     * @throws FetchError<404, types.PutV2SitesSiteIdChannelsChannelIdEnableResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.putV2SitesSite_idChannelsChannel_idEnable = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/channels/{channel_id}/enable/', 'put', metadata);
    };
    /**
     * Get a list of events that belong to a live channel
     *
     * @summary List live events
     * @throws FetchError<400, types.GetV2SitesSiteIdChannelsChannelIdEventsResponse400> Invalid JSON request body
     * @throws FetchError<404, types.GetV2SitesSiteIdChannelsChannelIdEventsResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idChannelsChannel_idEvents = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/channels/{channel_id}/events/', 'get', metadata);
    };
    /**
     * Get details for an event of a live channel
     *
     * @summary Get a live event
     * @throws FetchError<404, types.GetV2SitesSiteIdChannelsChannelIdEventsEventIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idChannelsChannel_idEventsEvent_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/channels/{channel_id}/events/{event_id}/', 'get', metadata);
    };
    SDK.prototype.putV2SitesSite_idChannelsChannel_idEventsEvent_idClip = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/channels/{channel_id}/events/{event_id}/clip/', 'put', body, metadata);
    };
    /**
     * Publish the event to the end-users.
     *
     * @summary Publish the event
     * @throws FetchError<404, types.PutV2SitesSiteIdChannelsChannelIdEventsEventIdPublishResponse404> Resource with ID supplied does not exist in account and object namespace
     * @throws FetchError<409, types.PutV2SitesSiteIdChannelsChannelIdEventsEventIdPublishResponse409> Request conflicts with state of target resource
     */
    SDK.prototype.putV2SitesSite_idChannelsChannel_idEventsEvent_idPublish = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/channels/{channel_id}/events/{event_id}/publish/', 'put', metadata);
    };
    /**
     * List media
     *
     * @summary List media
     * @throws FetchError<400, types.GetV2SitesSiteIdMediaResponse400> Invalid JSON request body
     */
    SDK.prototype.getV2SitesSite_idMedia = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/', 'get', metadata);
    };
    SDK.prototype.postV2SitesSite_idMedia = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/', 'post', body, metadata);
    };
    /**
     * Get a media
     *
     * @summary Get a media
     * @throws FetchError<404, types.GetV2SitesSiteIdMediaMediaIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idMediaMedia_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/', 'get', metadata);
    };
    SDK.prototype.patchV2SitesSite_idMediaMedia_id = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/', 'patch', body, metadata);
    };
    /**
     * Deletes the media for the given ID
     *
     * @summary Delete a media
     * @throws FetchError<404, types.DeleteV2SitesSiteIdMediaMediaIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.deleteV2SitesSite_idMediaMedia_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/', 'delete', metadata);
    };
    SDK.prototype.putV2SitesSite_idMediaMedia_idReupload = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/reupload/', 'put', body, metadata);
    };
    /**
     * List media protection rules
     *
     * @summary List media protection rules
     * @throws FetchError<400, types.GetV2SitesSiteIdMediaProtectionRulesResponse400> Invalid JSON request body
     */
    SDK.prototype.getV2SitesSite_idMedia_protection_rules = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media_protection_rules/', 'get', metadata);
    };
    SDK.prototype.postV2SitesSite_idMedia_protection_rules = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media_protection_rules/', 'post', body, metadata);
    };
    /**
     * Get a media protection rule
     *
     * @summary Get a media protection rule
     * @throws FetchError<404, types.GetV2SitesSiteIdMediaProtectionRulesProtectionRuleIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idMedia_protection_rulesProtection_rule_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media_protection_rules/{protection_rule_id}/', 'get', metadata);
    };
    SDK.prototype.patchV2SitesSite_idMedia_protection_rulesProtection_rule_id = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media_protection_rules/{protection_rule_id}/', 'patch', body, metadata);
    };
    /**
     * Delete a media protection rule
     *
     * @summary Delete a media protection rule
     * @throws FetchError<404, types.DeleteV2SitesSiteIdMediaProtectionRulesProtectionRuleIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.deleteV2SitesSite_idMedia_protection_rulesProtection_rule_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media_protection_rules/{protection_rule_id}/', 'delete', metadata);
    };
    /**
     * List media renditions
     *
     * @throws FetchError<400, types.GetV2SitesSiteIdMediaMediaIdMediaRenditionsResponse400> Invalid JSON request body
     * @throws FetchError<404, types.GetV2SitesSiteIdMediaMediaIdMediaRenditionsResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idMediaMedia_idMedia_renditions = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/media_renditions/', 'get', metadata);
    };
    SDK.prototype.postV2SitesSite_idMediaMedia_idMedia_renditions = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/media_renditions/', 'post', body, metadata);
    };
    /**
     * Get a media rendition
     *
     * @throws FetchError<400, types.GetV2SitesSiteIdMediaMediaIdMediaRenditionsRenditionIdResponse400> Invalid JSON request body
     * @throws FetchError<404, types.GetV2SitesSiteIdMediaMediaIdMediaRenditionsRenditionIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idMediaMedia_idMedia_renditionsRendition_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/media_renditions/{rendition_id}/', 'get', metadata);
    };
    /**
     * Delete a media rendition
     *
     * @throws FetchError<404, types.DeleteV2SitesSiteIdMediaMediaIdMediaRenditionsRenditionIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.deleteV2SitesSite_idMediaMedia_idMedia_renditionsRendition_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/media_renditions/{rendition_id}/', 'delete', metadata);
    };
    /**
     * Retrieves a list of resources that represent the uploaded files that make up a hosted
     * media
     *
     * These may be primary (for example a video file or the main audio file) or secondary (for
     * example an alternate audio track).
     *
     * @summary List originals
     * @throws FetchError<404, types.GetV2SitesSiteIdMediaMediaIdOriginalsResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idMediaMedia_idOriginals = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/originals/', 'get', metadata);
    };
    SDK.prototype.postV2SitesSite_idMediaMedia_idOriginals = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/originals/', 'post', body, metadata);
    };
    /**
     * Retrieves an original resource, which represents the primary or secondary files of a
     * hosted media, by ID
     *
     * @summary Get an original
     * @throws FetchError<404, types.GetV2SitesSiteIdMediaMediaIdOriginalsOriginalIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idMediaMedia_idOriginalsOriginal_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/originals/{original_id}/', 'get', metadata);
    };
    /**
     * Deletes an original resource ID
     *
     * Tracks corresponding to a deleted original will no longer be included for playback.
     *
     * Only secondary originals can be deleted. Secondary originals are used for [alternate
     * audio tracks](https://docs.jwplayer.com/platform/docs/vdh-add-alternate-audio-tracks)
     * and have `original_type` set to `secondary`.
     *
     * @summary Delete an original
     * @throws FetchError<404, types.DeleteV2SitesSiteIdMediaMediaIdOriginalsOriginalIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.deleteV2SitesSite_idMediaMedia_idOriginalsOriginal_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/originals/{original_id}/', 'delete', metadata);
    };
    /**
     * List strategy rules placements for a site
     *
     * @summary List strategy rules placements
     */
    SDK.prototype.getV2SitesSite_idPlacements = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/placements/', 'get', metadata);
    };
    SDK.prototype.postV2SitesSite_idPlacements = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/placements/', 'post', body, metadata);
    };
    /**
     * Retrieve the details of a specific strategy rules placement
     *
     * @summary Get a strategy rules placement
     * @throws FetchError<404, types.GetV2SitesSiteIdPlacementsPlacementIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idPlacementsPlacement_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/placements/{placement_id}/', 'get', metadata);
    };
    SDK.prototype.patchV2SitesSite_idPlacementsPlacement_id = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/placements/{placement_id}/', 'patch', body, metadata);
    };
    /**
     * Delete a specific strategy rules placement
     *
     * @summary Delete a strategy rules placement
     * @throws FetchError<404, types.DeleteV2SitesSiteIdPlacementsPlacementIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.deleteV2SitesSite_idPlacementsPlacement_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/placements/{placement_id}/', 'delete', metadata);
    };
    /**
     * List players
     *
     * @summary List players
     * @throws FetchError<400, types.GetV2SitesSiteIdPlayersResponse400> Invalid JSON request body
     */
    SDK.prototype.getV2SitesSite_idPlayers = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/players/', 'get', metadata);
    };
    SDK.prototype.postV2SitesSite_idPlayers = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/players/', 'post', body, metadata);
    };
    /**
     * Get a player
     *
     * @summary Get a player
     * @throws FetchError<404, types.GetV2SitesSiteIdPlayersPlayerIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idPlayersPlayer_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/players/{player_id}/', 'get', metadata);
    };
    SDK.prototype.patchV2SitesSite_idPlayersPlayer_id = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/players/{player_id}/', 'patch', body, metadata);
    };
    /**
     * Delete a player
     *
     * @summary Delete a player
     * @throws FetchError<404, types.DeleteV2SitesSiteIdPlayersPlayerIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.deleteV2SitesSite_idPlayersPlayer_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/players/{player_id}/', 'delete', metadata);
    };
    SDK.prototype.postV2SitesSite_idPlayersLogo = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/players/logo/', 'post', body, metadata);
    };
    /**
     * Get player logo
     *
     * @throws FetchError<400, types.GetV2SitesSiteIdPlayersLogoLogoIdResponse400> Invalid JSON request body
     * @throws FetchError<404, types.GetV2SitesSiteIdPlayersLogoLogoIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idPlayersLogoLogo_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/players/logo/{logo_id}/', 'get', metadata);
    };
    /**
     * List playlists
     *
     * @throws FetchError<400, types.GetV2SitesSiteIdPlaylistsResponse400> Invalid JSON request body
     * @throws FetchError<404, types.GetV2SitesSiteIdPlaylistsResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idPlaylists = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/playlists/', 'get', metadata);
    };
    /**
     * Get a playlist
     *
     * @throws FetchError<404, types.GetV2SitesSiteIdPlaylistsPlaylistIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idPlaylistsPlaylist_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/playlists/{playlist_id}/', 'get', metadata);
    };
    /**
     * Delete a playlist
     *
     * @throws FetchError<404, types.DeleteV2SitesSiteIdPlaylistsPlaylistIdResponse404> Resource with ID supplied does not exist in account and object namespace
     * @throws FetchError<405, types.DeleteV2SitesSiteIdPlaylistsPlaylistIdResponse405> Method is not allowed on the requested resource
     */
    SDK.prototype.deleteV2SitesSite_idPlaylistsPlaylist_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/playlists/{playlist_id}/', 'delete', metadata);
    };
    SDK.prototype.postV2SitesSite_idPlaylistsManual_playlist = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/playlists/manual_playlist/', 'post', body, metadata);
    };
    /**
     * Get a manual playlist
     *
     * @throws FetchError<404, types.GetV2SitesSiteIdPlaylistsPlaylistIdManualPlaylistResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idPlaylistsPlaylist_idManual_playlist = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/playlists/{playlist_id}/manual_playlist/', 'get', metadata);
    };
    SDK.prototype.patchV2SitesSite_idPlaylistsPlaylist_idManual_playlist = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/playlists/{playlist_id}/manual_playlist/', 'patch', body, metadata);
    };
    /**
     * Delete a manual playlist
     *
     * @throws FetchError<404, types.DeleteV2SitesSiteIdPlaylistsPlaylistIdManualPlaylistResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.deleteV2SitesSite_idPlaylistsPlaylist_idManual_playlist = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/playlists/{playlist_id}/manual_playlist/', 'delete', metadata);
    };
    SDK.prototype.postV2SitesSite_idPlaylistsDynamic_playlist = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/playlists/dynamic_playlist/', 'post', body, metadata);
    };
    /**
     * Get a dynamic playlist
     *
     * @throws FetchError<404, types.GetV2SitesSiteIdPlaylistsPlaylistIdDynamicPlaylistResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idPlaylistsPlaylist_idDynamic_playlist = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/playlists/{playlist_id}/dynamic_playlist/', 'get', metadata);
    };
    SDK.prototype.patchV2SitesSite_idPlaylistsPlaylist_idDynamic_playlist = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/playlists/{playlist_id}/dynamic_playlist/', 'patch', body, metadata);
    };
    /**
     * Delete a dynamic playlist
     *
     * @throws FetchError<404, types.DeleteV2SitesSiteIdPlaylistsPlaylistIdDynamicPlaylistResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.deleteV2SitesSite_idPlaylistsPlaylist_idDynamic_playlist = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/playlists/{playlist_id}/dynamic_playlist/', 'delete', metadata);
    };
    SDK.prototype.postV2SitesSite_idPlaylistsArticle_matching_playlist = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/playlists/article_matching_playlist/', 'post', body, metadata);
    };
    /**
     * Get an article matching playlist
     *
     * @throws FetchError<404, types.GetV2SitesSiteIdPlaylistsPlaylistIdArticleMatchingPlaylistResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idPlaylistsPlaylist_idArticle_matching_playlist = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/playlists/{playlist_id}/article_matching_playlist/', 'get', metadata);
    };
    SDK.prototype.patchV2SitesSite_idPlaylistsPlaylist_idArticle_matching_playlist = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/playlists/{playlist_id}/article_matching_playlist/', 'patch', body, metadata);
    };
    /**
     * Delete an article matching playlist
     *
     * @throws FetchError<404, types.DeleteV2SitesSiteIdPlaylistsPlaylistIdArticleMatchingPlaylistResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.deleteV2SitesSite_idPlaylistsPlaylist_idArticle_matching_playlist = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/playlists/{playlist_id}/article_matching_playlist/', 'delete', metadata);
    };
    SDK.prototype.postV2SitesSite_idPlaylistsSearch_playlist = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/playlists/search_playlist/', 'post', body, metadata);
    };
    /**
     * Get a search playlist
     *
     * @throws FetchError<404, types.GetV2SitesSiteIdPlaylistsPlaylistIdSearchPlaylistResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idPlaylistsPlaylist_idSearch_playlist = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/playlists/{playlist_id}/search_playlist/', 'get', metadata);
    };
    SDK.prototype.patchV2SitesSite_idPlaylistsPlaylist_idSearch_playlist = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/playlists/{playlist_id}/search_playlist/', 'patch', body, metadata);
    };
    /**
     * Delete a search playlist
     *
     * @throws FetchError<404, types.DeleteV2SitesSiteIdPlaylistsPlaylistIdSearchPlaylistResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.deleteV2SitesSite_idPlaylistsPlaylist_idSearch_playlist = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/playlists/{playlist_id}/search_playlist/', 'delete', metadata);
    };
    SDK.prototype.postV2SitesSite_idPlaylistsRecommendations_playlist = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/playlists/recommendations_playlist/', 'post', body, metadata);
    };
    /**
     * Get a recommendations playlist
     *
     * @throws FetchError<404, types.GetV2SitesSiteIdPlaylistsPlaylistIdRecommendationsPlaylistResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idPlaylistsPlaylist_idRecommendations_playlist = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/playlists/{playlist_id}/recommendations_playlist/', 'get', metadata);
    };
    SDK.prototype.patchV2SitesSite_idPlaylistsPlaylist_idRecommendations_playlist = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/playlists/{playlist_id}/recommendations_playlist/', 'patch', body, metadata);
    };
    /**
     * Delete a recommendations playlist
     *
     * @throws FetchError<404, types.DeleteV2SitesSiteIdPlaylistsPlaylistIdRecommendationsPlaylistResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.deleteV2SitesSite_idPlaylistsPlaylist_idRecommendations_playlist = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/playlists/{playlist_id}/recommendations_playlist/', 'delete', metadata);
    };
    SDK.prototype.postV2SitesSite_idPlaylistsWatchlist_playlist = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/playlists/watchlist_playlist/', 'post', body, metadata);
    };
    /**
     * Get a watchlist playlist
     *
     * @throws FetchError<404, types.GetV2SitesSiteIdPlaylistsPlaylistIdWatchlistPlaylistResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idPlaylistsPlaylist_idWatchlist_playlist = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/playlists/{playlist_id}/watchlist_playlist/', 'get', metadata);
    };
    SDK.prototype.patchV2SitesSite_idPlaylistsPlaylist_idWatchlist_playlist = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/playlists/{playlist_id}/watchlist_playlist/', 'patch', body, metadata);
    };
    /**
     * Delete a watchlist playlist
     *
     * @throws FetchError<404, types.DeleteV2SitesSiteIdPlaylistsPlaylistIdWatchlistPlaylistResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.deleteV2SitesSite_idPlaylistsPlaylist_idWatchlist_playlist = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/playlists/{playlist_id}/watchlist_playlist/', 'delete', metadata);
    };
    /**
     * List series
     *
     * @throws FetchError<400, types.GetV2SitesSiteIdSeriesResponse400> Invalid JSON request body
     */
    SDK.prototype.getV2SitesSite_idSeries = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/series/', 'get', metadata);
    };
    /**
     * Create a series
     *
     * @throws FetchError<400, types.PostV2SitesSiteIdSeriesResponse400> Invalid JSON request body
     */
    SDK.prototype.postV2SitesSite_idSeries = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/series/', 'post', body, metadata);
    };
    /**
     * Get a series
     *
     * @throws FetchError<404, types.GetV2SitesSiteIdSeriesSeriesIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idSeriesSeries_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/series/{series_id}/', 'get', metadata);
    };
    SDK.prototype.patchV2SitesSite_idSeriesSeries_id = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/series/{series_id}/', 'patch', body, metadata);
    };
    /**
     * Delete a series
     *
     * @throws FetchError<404, types.DeleteV2SitesSiteIdSeriesSeriesIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.deleteV2SitesSite_idSeriesSeries_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/series/{series_id}/', 'delete', metadata);
    };
    /**
     * List seasons
     *
     * @throws FetchError<400, types.GetV2SitesSiteIdSeriesSeriesIdSeasonsResponse400> Invalid JSON request body
     */
    SDK.prototype.getV2SitesSite_idSeriesSeries_idSeasons = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/series/{series_id}/seasons/', 'get', metadata);
    };
    /**
     * Create a season
     *
     * @throws FetchError<400, types.PostV2SitesSiteIdSeriesSeriesIdSeasonsResponse400> Invalid JSON request body
     */
    SDK.prototype.postV2SitesSite_idSeriesSeries_idSeasons = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/series/{series_id}/seasons/', 'post', body, metadata);
    };
    /**
     * Get a season
     *
     * @throws FetchError<404, types.GetV2SitesSiteIdSeriesSeriesIdSeasonsSeasonIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idSeriesSeries_idSeasonsSeason_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/series/{series_id}/seasons/{season_id}/', 'get', metadata);
    };
    SDK.prototype.patchV2SitesSite_idSeriesSeries_idSeasonsSeason_id = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/series/{series_id}/seasons/{season_id}/', 'patch', body, metadata);
    };
    /**
     * Delete a season
     *
     * @throws FetchError<404, types.DeleteV2SitesSiteIdSeriesSeriesIdSeasonsSeasonIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.deleteV2SitesSite_idSeriesSeries_idSeasonsSeason_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/series/{series_id}/seasons/{season_id}/', 'delete', metadata);
    };
    /**
     * Get the site protection rule
     *
     * @summary Get the site protection rule
     */
    SDK.prototype.getV2SitesSite_idSite_protection_rule = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/site_protection_rule/', 'get', metadata);
    };
    SDK.prototype.patchV2SitesSite_idSite_protection_rule = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/site_protection_rule/', 'patch', body, metadata);
    };
    /**
     * List all ad configs for a site
     *
     * @summary List ad configs
     */
    SDK.prototype.getV2SitesSite_idAd_configs = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/ad_configs/', 'get', metadata);
    };
    /**
     * Create an ad config for a site
     *
     * @summary Create an ad config
     */
    SDK.prototype.postV2SitesSite_idAd_configs = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/ad_configs/', 'post', body, metadata);
    };
    /**
     * Retrieve the details of a specific ad config
     *
     * @summary Get an ad config
     */
    SDK.prototype.getV2SitesSite_idAd_configsAd_config_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/ad_configs/{ad_config_id}/', 'get', metadata);
    };
    /**
     * Update a specific ad config
     *
     * @summary Update an ad config
     */
    SDK.prototype.patchV2SitesSite_idAd_configsAd_config_id = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/ad_configs/{ad_config_id}/', 'patch', body, metadata);
    };
    /**
     * Delete a specific ad config
     *
     * @summary Delete an ad config
     */
    SDK.prototype.deleteV2SitesSite_idAd_configsAd_config_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/ad_configs/{ad_config_id}/', 'delete', metadata);
    };
    /**
     * List all timings sets for a media
     *
     * @summary List media timings sets
     */
    SDK.prototype.getV2SitesSite_idMediaMedia_idTimings = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/timings/', 'get', metadata);
    };
    /**
     * Create a set of ad timings for a media
     *
     * @summary Create a media timings set
     */
    SDK.prototype.postV2SitesSite_idMediaMedia_idTimings = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/timings/', 'post', body, metadata);
    };
    /**
     * Get a specific set of ad timings for a media
     *
     * @summary Get a media timings set
     */
    SDK.prototype.getV2SitesSite_idMediaMedia_idTimingsTiming_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/timings/{timing_id}/', 'get', metadata);
    };
    /**
     * Update a specific set of ad timings for a media
     *
     * @summary Update a media timings set
     */
    SDK.prototype.patchV2SitesSite_idMediaMedia_idTimingsTiming_id = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/timings/{timing_id}/', 'patch', body, metadata);
    };
    /**
     * Delete a specific set of ad timings for a media
     *
     * @summary Delete a media timings set
     */
    SDK.prototype.deleteV2SitesSite_idMediaMedia_idTimingsTiming_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/timings/{timing_id}/', 'delete', metadata);
    };
    /**
     * List all SSAI strategy configs for a site
     *
     * @summary List SSAI strategy configs
     */
    SDK.prototype.getV2SitesSite_idSsai_strategies = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/ssai_strategies/', 'get', metadata);
    };
    /**
     * Create an SSAI strategy config for a site
     *
     * @summary Create an SSAI strategy config
     */
    SDK.prototype.postV2SitesSite_idSsai_strategies = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/ssai_strategies/', 'post', body, metadata);
    };
    /**
     * Get a specific SSAI strategy config
     *
     * @summary Get an SSAI strategy config
     */
    SDK.prototype.getV2SitesSite_idSsai_strategiesAd_config_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/ssai_strategies/{ad_config_id}/', 'get', metadata);
    };
    /**
     * Update a specific SSAI strategy config
     *
     * @summary Update an SSAI strategy config
     */
    SDK.prototype.patchV2SitesSite_idSsai_strategiesAd_config_id = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/ssai_strategies/{ad_config_id}/', 'patch', body, metadata);
    };
    /**
     * Delete a specific SSAI strategy config
     *
     * @summary Delete an SSAI strategy config
     */
    SDK.prototype.deleteV2SitesSite_idSsai_strategiesAd_config_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/ssai_strategies/{ad_config_id}/', 'delete', metadata);
    };
    /**
     * Create an ad break for a live media
     *
     * @summary Create live ad break
     * @throws FetchError<404, types.PostV2SitesSiteIdLiveMediaIdAdBreaksResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.postV2SitesSite_idLiveMedia_idAd_breaks = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/live/{media_id}/ad_breaks/', 'post', body, metadata);
    };
    /**
     * List all live ad breaks for a media
     *
     * @summary List live ad breaks
     * @throws FetchError<404, types.GetV2SitesSiteIdLiveMediaIdAdBreaksResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idLiveMedia_idAd_breaks = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/live/{media_id}/ad_breaks/', 'get', metadata);
    };
    /**
     * List tags on the account
     *
     * @summary List tags
     * @throws FetchError<400, types.GetV2SitesSiteIdTagsResponse400> Invalid JSON request body
     */
    SDK.prototype.getV2SitesSite_idTags = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/tags/', 'get', metadata);
    };
    SDK.prototype.postV2SitesSite_idTags = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/tags/', 'post', body, metadata);
    };
    /**
     * Removes and deletes a tag across all associated media and playlist resources, removing
     * it from dashboard suggestions
     * This makes it possible to recreate the tag with a different capitalization.
     * The time to complete the tag removal depends upon the number of associated media and
     * playlists.
     *
     * @summary Bulk remove tags
     * @throws FetchError<400, types.PutV2SitesSiteIdRemoveTagResponse400> Invalid JSON request body
     */
    SDK.prototype.putV2SitesSite_idRemove_tag = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/remove_tag/', 'put', body, metadata);
    };
    /**
     * Renames a tag across all associated media and playlist resources
     * The time to complete the tag renaming depends upon the number of associated media and
     * playlists.
     *
     * @summary Bulk rename tags
     * @throws FetchError<400, types.PutV2SitesSiteIdRenameTagResponse400> Invalid JSON request body
     */
    SDK.prototype.putV2SitesSite_idRename_tag = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/rename_tag/', 'put', body, metadata);
    };
    /**
     * List text tracks
     *
     * @throws FetchError<400, types.GetV2SitesSiteIdMediaMediaIdTextTracksResponse400> Invalid JSON request body
     * @throws FetchError<404, types.GetV2SitesSiteIdMediaMediaIdTextTracksResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idMediaMedia_idText_tracks = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/text_tracks/', 'get', metadata);
    };
    SDK.prototype.postV2SitesSite_idMediaMedia_idText_tracks = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/text_tracks/', 'post', body, metadata);
    };
    /**
     * Get a text track
     *
     * @throws FetchError<400, types.GetV2SitesSiteIdMediaMediaIdTextTracksTrackIdResponse400> Invalid JSON request body
     * @throws FetchError<404, types.GetV2SitesSiteIdMediaMediaIdTextTracksTrackIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idMediaMedia_idText_tracksTrack_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/text_tracks/{track_id}/', 'get', metadata);
    };
    SDK.prototype.patchV2SitesSite_idMediaMedia_idText_tracksTrack_id = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/text_tracks/{track_id}/', 'patch', body, metadata);
    };
    /**
     * Delete a text track
     *
     * @throws FetchError<404, types.DeleteV2SitesSiteIdMediaMediaIdTextTracksTrackIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.deleteV2SitesSite_idMediaMedia_idText_tracksTrack_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/text_tracks/{track_id}/', 'delete', metadata);
    };
    /**
     * Enables a text track to be delivered via the Delivery API by changing the track status
     * from `draft` to `ready`.
     *
     * @summary Publish a track
     * @throws FetchError<409, types.PutV2SitesSiteIdMediaMediaIdTextTracksTrackIdPublishResponse409> Request conflicts with state of target resource
     */
    SDK.prototype.putV2SitesSite_idMediaMedia_idText_tracksTrack_idPublish = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/text_tracks/{track_id}/publish/', 'put', metadata);
    };
    /**
     * Prevents a text track from delivering via the Delivery API by changing the track status
     * from `ready` to `draft`.
     *
     * @summary Unpublish a track
     * @throws FetchError<409, types.PutV2SitesSiteIdMediaMediaIdTextTracksTrackIdUnpublishResponse409> Request conflicts with state of target resource
     */
    SDK.prototype.putV2SitesSite_idMediaMedia_idText_tracksTrack_idUnpublish = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/media/{media_id}/text_tracks/{track_id}/unpublish/', 'put', metadata);
    };
    /**
     * Create a thumbnail
     *
     * @summary Create a thumbnail
     * @throws FetchError<400, types.PostV2SitesSiteIdThumbnailsResponse400> Invalid JSON request body
     */
    SDK.prototype.postV2SitesSite_idThumbnails = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/thumbnails/', 'post', body, metadata);
    };
    /**
     * List thumbnails
     *
     * @summary List thumbnails
     * @throws FetchError<400, types.GetV2SitesSiteIdThumbnailsResponse400> Invalid JSON request body
     * @throws FetchError<404, types.GetV2SitesSiteIdThumbnailsResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idThumbnails = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/thumbnails/', 'get', metadata);
    };
    /**
     * Update a thumbnail
     *
     * @summary Update a thumbnail
     * @throws FetchError<400, types.PatchV2SitesSiteIdThumbnailsThumbnailIdResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PatchV2SitesSiteIdThumbnailsThumbnailIdResponse404> Resource with ID supplied does not exist in account and object namespace
     * @throws FetchError<409, types.PatchV2SitesSiteIdThumbnailsThumbnailIdResponse409> Request conflicts with state of target resource
     */
    SDK.prototype.patchV2SitesSite_idThumbnailsThumbnail_id = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/thumbnails/{thumbnail_id}/', 'patch', body, metadata);
    };
    /**
     * Get a thumbnail
     *
     * @summary Get a thumbnail
     * @throws FetchError<404, types.GetV2SitesSiteIdThumbnailsThumbnailIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idThumbnailsThumbnail_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/thumbnails/{thumbnail_id}/', 'get', metadata);
    };
    /**
     * Delete a thumbnail
     *
     * @summary Delete a thumbnail
     * @throws FetchError<400, types.DeleteV2SitesSiteIdThumbnailsThumbnailIdResponse400> Invalid JSON request body
     * @throws FetchError<404, types.DeleteV2SitesSiteIdThumbnailsThumbnailIdResponse404> Resource with ID supplied does not exist in account and object namespace
     * @throws FetchError<409, types.DeleteV2SitesSiteIdThumbnailsThumbnailIdResponse409> Request conflicts with state of target resource
     */
    SDK.prototype.deleteV2SitesSite_idThumbnailsThumbnail_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/thumbnails/{thumbnail_id}/', 'delete', metadata);
    };
    /**
     * Transforms content using a transformation agent in a single API call
     *
     * This endpoint orchestrates the following operations:
     * 1. Locates an existing project by `external_id`, or creates a new one
     * 2. Creates an input asset from the provided content
     * 3. Queues a transformation run for processing
     *
     * **Input requirements:**
     * - `article_to_audio` agents require `asset_type: "article"`
     * - `text_to_audio` agents require `asset_type: "text"`
     *
     * @summary Transform content
     * @throws FetchError<400, types.PutV2SitesSiteIdTransformationTransformResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PutV2SitesSiteIdTransformationTransformResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.putV2SitesSite_idTransformation_transform = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/transformation_transform/', 'put', body, metadata);
    };
    /**
     * Retrieves a paginated list of transformation runs for the specified site
     *
     * @summary List transformation runs
     */
    SDK.prototype.getV2SitesSite_idTransformation_runs = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/transformation_runs/', 'get', metadata);
    };
    /**
     * Retrieves a specific transformation run by ID
     *
     * @summary Get a transformation run
     * @throws FetchError<404, types.GetV2SitesSiteIdTransformationRunsTransformationRunIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idTransformation_runsTransformation_run_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/transformation_runs/{transformation_run_id}/', 'get', metadata);
    };
    /**
     * Retrieves a paginated list of assets created by transformations for the specified site
     *
     * @summary List transformation assets
     */
    SDK.prototype.getV2SitesSite_idTransformation_assets = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/transformation_assets/', 'get', metadata);
    };
    /**
     * Retrieves a specific transformation asset by ID
     *
     * @summary Get a transformation asset
     * @throws FetchError<404, types.GetV2SitesSiteIdTransformationAssetsAssetIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idTransformation_assetsAsset_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/transformation_assets/{asset_id}/', 'get', metadata);
    };
    /**
     * Update an asset
     *
     * @throws FetchError<400, types.PatchV2SitesSiteIdTransformationAssetsAssetIdResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PatchV2SitesSiteIdTransformationAssetsAssetIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.patchV2SitesSite_idTransformation_assetsAsset_id = function (body, metadata) {
        return this.core.fetch('/v2/sites/{site_id}/transformation_assets/{asset_id}/', 'patch', body, metadata);
    };
    /**
     * Unpublishes an asset, making it unavailable for delivery
     *
     * This operation:
     * - Sets `published_version_id` to null
     * - Sets `status` to `disabled`
     * - Creates a new asset version snapshot with the disabled status
     *
     * @summary Unpublish a transformation asset
     * @throws FetchError<404, types.PutV2SitesSiteIdTransformationAssetsAssetIdUnpublishResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.putV2SitesSite_idTransformation_assetsAsset_idUnpublish = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/transformation_assets/{asset_id}/unpublish/', 'put', metadata);
    };
    /**
     * Retrieves a paginated list of transformation projects for the specified site
     *
     * @summary List transformation projects
     */
    SDK.prototype.getV2SitesSite_idTransformation_projects = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/transformation_projects/', 'get', metadata);
    };
    /**
     * Retrieves a specific transformation project by ID
     *
     * @summary Get a transformation project
     * @throws FetchError<404, types.GetV2SitesSiteIdTransformationProjectsProjectIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idTransformation_projectsProject_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/transformation_projects/{project_id}/', 'get', metadata);
    };
    /**
     * Retrieves a paginated list of asset version snapshots for the specified site
     *
     * @summary List transformation asset versions
     */
    SDK.prototype.getV2SitesSite_idTransformation_asset_versions = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/transformation_asset_versions/', 'get', metadata);
    };
    /**
     * Retrieves a specific asset version snapshot by ID
     *
     * @summary Get a transformation asset version
     * @throws FetchError<404, types.GetV2SitesSiteIdTransformationAssetVersionsAssetVersionIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idTransformation_asset_versionsAsset_version_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/transformation_asset_versions/{asset_version_id}/', 'get', metadata);
    };
    /**
     * Retrieves a specific article audio variant by ID
     *
     * @summary Get an article audio variant
     * @throws FetchError<404, types.GetV2SitesSiteIdArticleAudioVariantsArticleAudioVariantIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idArticle_audio_variantsArticle_audio_variant_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/article_audio_variants/{article_audio_variant_id}/', 'get', metadata);
    };
    /**
     * Retrieves a paginated list of versions for a specific article audio variant
     *
     * @summary List article audio variant versions
     */
    SDK.prototype.getV2SitesSite_idArticle_audio_variantsArticle_audio_variant_idVersions = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/article_audio_variants/{article_audio_variant_id}/versions/', 'get', metadata);
    };
    /**
     * Retrieves a specific article audio variant version by ID
     *
     * @summary Get an article audio variant version
     * @throws FetchError<404, types.GetV2SitesSiteIdArticleAudioVariantsArticleAudioVariantIdVersionsArticleAudioVariantVersionIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2SitesSite_idArticle_audio_variantsArticle_audio_variant_idVersionsArticle_audio_variant_version_id = function (metadata) {
        return this.core.fetch('/v2/sites/{site_id}/article_audio_variants/{article_audio_variant_id}/versions/{article_audio_variant_version_id}/', 'get', metadata);
    };
    /**
     * List of parts, both completed and uncompleted, each of which represents a range of bytes
     * for a multipart upload
     * All multipart uploads start with 10,000 parts. All completed parts will be included in
     * the final upload file.
     *
     * @summary List upload parts
     * @throws FetchError<403, types.GetV2UploadsUploadIdPartsResponse403> Action forbidden.
     * @throws FetchError<404, types.GetV2UploadsUploadIdPartsResponse404> Resource with ID supplied does not exist in account and object namespace
     * @throws FetchError<409, types.GetV2UploadsUploadIdPartsResponse409> Request conflicts with state of target resource
     */
    SDK.prototype.getV2UploadsUpload_idParts = function (metadata) {
        return this.core.fetch('/v2/uploads/{upload_id}/parts/', 'get', metadata);
    };
    /**
     * All parts must be uploaded to complete the multipart upload.
     *
     * @summary Complete an upload
     * @throws FetchError<403, types.PutV2UploadsUploadIdCompleteResponse403> Action forbidden.
     * @throws FetchError<404, types.PutV2UploadsUploadIdCompleteResponse404> Resource with ID supplied does not exist in account and object namespace
     * @throws FetchError<409, types.PutV2UploadsUploadIdCompleteResponse409> Request conflicts with state of target resource
     */
    SDK.prototype.putV2UploadsUpload_idComplete = function (metadata) {
        return this.core.fetch('/v2/uploads/{upload_id}/complete/', 'put', metadata);
    };
    /**
     * List webhooks on the account
     *
     * @summary List webhooks
     * @throws FetchError<400, types.GetV2WebhooksResponse400> Invalid JSON request body
     */
    SDK.prototype.getV2Webhooks = function (metadata) {
        return this.core.fetch('/v2/webhooks/', 'get', metadata);
    };
    /**
     * Create a webhook
     *
     * @summary Create a webhook
     * @throws FetchError<400, types.PostV2WebhooksResponse400> Invalid JSON request body
     * @throws FetchError<409, types.PostV2WebhooksResponse409> Request conflicts with state of target resource
     */
    SDK.prototype.postV2Webhooks = function (body) {
        return this.core.fetch('/v2/webhooks/', 'post', body);
    };
    /**
     * Get a webhook
     *
     * @summary Get a webhook
     * @throws FetchError<404, types.GetV2WebhooksWebhookIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.getV2WebhooksWebhook_id = function (metadata) {
        return this.core.fetch('/v2/webhooks/{webhook_id}/', 'get', metadata);
    };
    SDK.prototype.patchV2WebhooksWebhook_id = function (body, metadata) {
        return this.core.fetch('/v2/webhooks/{webhook_id}/', 'patch', body, metadata);
    };
    /**
     * Delete a webhook
     *
     * @summary Delete a webhook
     * @throws FetchError<404, types.DeleteV2WebhooksWebhookIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    SDK.prototype.deleteV2WebhooksWebhook_id = function (metadata) {
        return this.core.fetch('/v2/webhooks/{webhook_id}/', 'delete', metadata);
    };
    return SDK;
}());
var createSDK = (function () { return new SDK(); })();
module.exports = createSDK;
