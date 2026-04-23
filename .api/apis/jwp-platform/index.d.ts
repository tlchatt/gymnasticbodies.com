import type * as types from './types';
import type { ConfigOptions, FetchResponse } from 'api/dist/core';
import Oas from 'oas';
import APICore from 'api/dist/core';
declare class SDK {
    spec: Oas;
    core: APICore;
    constructor();
    /**
     * Optionally configure various options that the SDK allows.
     *
     * @param config Object of supported SDK options and toggles.
     * @param config.timeout Override the default `fetch` request timeout of 30 seconds. This number
     * should be represented in milliseconds.
     */
    config(config: ConfigOptions): void;
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
    auth(...values: string[] | number[]): this;
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
    server(url: string, variables?: {}): void;
    /**
     * List player bidding configurations
     *
     * @summary List player bidding configurations
     * @throws FetchError<400, types.GetV2SitesSiteIdAdvertisingPlayerBiddingConfigsResponse400> Invalid JSON request body
     */
    getV2SitesSite_idAdvertisingPlayer_bidding_configs(metadata: types.GetV2SitesSiteIdAdvertisingPlayerBiddingConfigsMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdAdvertisingPlayerBiddingConfigsResponse200>>;
    /**
     * Create a player bidding configuration resource. Currently only one configuration is
     * allowed.
     *
     * @summary Create a player bidding configuration
     * @throws FetchError<400, types.PostV2SitesSiteIdAdvertisingPlayerBiddingConfigsResponse400> Invalid JSON request body
     * @throws FetchError<422, types.PostV2SitesSiteIdAdvertisingPlayerBiddingConfigsResponse422> Unprocessable Entity
     */
    postV2SitesSite_idAdvertisingPlayer_bidding_configs(body: types.PostV2SitesSiteIdAdvertisingPlayerBiddingConfigsBodyParam, metadata: types.PostV2SitesSiteIdAdvertisingPlayerBiddingConfigsMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdAdvertisingPlayerBiddingConfigsResponse201>>;
    postV2SitesSite_idAdvertisingPlayer_bidding_configs(metadata: types.PostV2SitesSiteIdAdvertisingPlayerBiddingConfigsMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdAdvertisingPlayerBiddingConfigsResponse201>>;
    /**
     * Get a player bidding configuration
     *
     * @summary Get a player bidding configuration
     * @throws FetchError<404, types.GetV2SitesSiteIdAdvertisingPlayerBiddingConfigsConfigIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idAdvertisingPlayer_bidding_configsConfig_id(metadata: types.GetV2SitesSiteIdAdvertisingPlayerBiddingConfigsConfigIdMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdAdvertisingPlayerBiddingConfigsConfigIdResponse200>>;
    /**
     * Update a player bidding configuration
     *
     * @summary Update a player bidding configuration
     * @throws FetchError<404, types.PatchV2SitesSiteIdAdvertisingPlayerBiddingConfigsConfigIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    patchV2SitesSite_idAdvertisingPlayer_bidding_configsConfig_id(body: types.PatchV2SitesSiteIdAdvertisingPlayerBiddingConfigsConfigIdBodyParam, metadata: types.PatchV2SitesSiteIdAdvertisingPlayerBiddingConfigsConfigIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdAdvertisingPlayerBiddingConfigsConfigIdResponse200>>;
    patchV2SitesSite_idAdvertisingPlayer_bidding_configsConfig_id(metadata: types.PatchV2SitesSiteIdAdvertisingPlayerBiddingConfigsConfigIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdAdvertisingPlayerBiddingConfigsConfigIdResponse200>>;
    /**
     * Delete a player bidding configuration
     *
     * @summary Delete a player bidding configuration
     * @throws FetchError<404, types.DeleteV2SitesSiteIdAdvertisingPlayerBiddingConfigsConfigIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    deleteV2SitesSite_idAdvertisingPlayer_bidding_configsConfig_id(metadata: types.DeleteV2SitesSiteIdAdvertisingPlayerBiddingConfigsConfigIdMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * Update ad schedules with the player bidding configuration
     *
     * @summary Update ad schedules with the player bidding configuration
     * @throws FetchError<400, types.PutV2SitesSiteIdAdvertisingUpdateSchedulesPlayerBiddingConfigsResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PutV2SitesSiteIdAdvertisingUpdateSchedulesPlayerBiddingConfigsResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    putV2SitesSite_idAdvertisingUpdate_schedules_player_bidding_configs(body: types.PutV2SitesSiteIdAdvertisingUpdateSchedulesPlayerBiddingConfigsBodyParam, metadata: types.PutV2SitesSiteIdAdvertisingUpdateSchedulesPlayerBiddingConfigsMetadataParam): Promise<FetchResponse<number, unknown>>;
    putV2SitesSite_idAdvertisingUpdate_schedules_player_bidding_configs(metadata: types.PutV2SitesSiteIdAdvertisingUpdateSchedulesPlayerBiddingConfigsMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * List advertising schedules
     *
     * @summary List advertising schedules
     * @throws FetchError<400, types.GetV2SitesSiteIdAdvertisingSchedulesResponse400> Invalid JSON request body
     */
    getV2SitesSite_idAdvertisingSchedules(metadata: types.GetV2SitesSiteIdAdvertisingSchedulesMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdAdvertisingSchedulesResponse200>>;
    /**
     * Create an advertising schedule
     *
     * @summary Create an advertising schedule
     * @throws FetchError<400, types.PostV2SitesSiteIdAdvertisingSchedulesResponse400> Invalid JSON request body
     */
    postV2SitesSite_idAdvertisingSchedules(body: types.PostV2SitesSiteIdAdvertisingSchedulesBodyParam, metadata: types.PostV2SitesSiteIdAdvertisingSchedulesMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdAdvertisingSchedulesResponse201>>;
    postV2SitesSite_idAdvertisingSchedules(metadata: types.PostV2SitesSiteIdAdvertisingSchedulesMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdAdvertisingSchedulesResponse201>>;
    /**
     * Get an advertising schedule
     *
     * @summary Get an advertising schedule
     * @throws FetchError<404, types.GetV2SitesSiteIdAdvertisingSchedulesAdScheduleIdResponse404> Invalid JSON request body
     */
    getV2SitesSite_idAdvertisingSchedulesAd_schedule_id(metadata: types.GetV2SitesSiteIdAdvertisingSchedulesAdScheduleIdMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdAdvertisingSchedulesAdScheduleIdResponse200>>;
    /**
     * Update an advertising schedule
     *
     * @summary Update an advertising schedule
     * @throws FetchError<400, types.PatchV2SitesSiteIdAdvertisingSchedulesAdScheduleIdResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PatchV2SitesSiteIdAdvertisingSchedulesAdScheduleIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    patchV2SitesSite_idAdvertisingSchedulesAd_schedule_id(body: types.PatchV2SitesSiteIdAdvertisingSchedulesAdScheduleIdBodyParam, metadata: types.PatchV2SitesSiteIdAdvertisingSchedulesAdScheduleIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdAdvertisingSchedulesAdScheduleIdResponse200>>;
    patchV2SitesSite_idAdvertisingSchedulesAd_schedule_id(metadata: types.PatchV2SitesSiteIdAdvertisingSchedulesAdScheduleIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdAdvertisingSchedulesAdScheduleIdResponse200>>;
    /**
     * Delete an advertising schedule
     *
     * @summary Delete an advertising schedule
     * @throws FetchError<404, types.DeleteV2SitesSiteIdAdvertisingSchedulesAdScheduleIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    deleteV2SitesSite_idAdvertisingSchedulesAd_schedule_id(metadata: types.DeleteV2SitesSiteIdAdvertisingSchedulesAdScheduleIdMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * Fetches an analytics report over a custom date range
     *
     * @summary Fetches an analytics report over a custom date range
     */
    postV2SitesSite_idAnalyticsQueries(body: types.PostV2SitesSiteIdAnalyticsQueriesBodyParam, metadata: types.PostV2SitesSiteIdAnalyticsQueriesMetadataParam): Promise<FetchResponse<200, types.PostV2SitesSiteIdAnalyticsQueriesResponse200>>;
    /**
     * List all app configs for a site
     *
     * @summary List app configs
     */
    getV2SitesSite_idApp_configs(metadata: types.GetV2SitesSiteIdAppConfigsMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdAppConfigsResponse200> | FetchResponse<number, types.GetV2SitesSiteIdAppConfigsResponseDefault>>;
    /**
     * Create a new app config for a site
     *
     * @summary Create an app config
     */
    postV2SitesSite_idApp_configs(body: types.PostV2SitesSiteIdAppConfigsBodyParam, metadata: types.PostV2SitesSiteIdAppConfigsMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdAppConfigsResponse201> | FetchResponse<number, types.PostV2SitesSiteIdAppConfigsResponseDefault>>;
    postV2SitesSite_idApp_configs(metadata: types.PostV2SitesSiteIdAppConfigsMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdAppConfigsResponse201> | FetchResponse<number, types.PostV2SitesSiteIdAppConfigsResponseDefault>>;
    /**
     * Retrieve the details of a specific app config
     *
     * @summary Get an app config
     */
    getV2SitesSite_idApp_configsApp_config_id(metadata: types.GetV2SitesSiteIdAppConfigsAppConfigIdMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdAppConfigsAppConfigIdResponse200> | FetchResponse<number, types.GetV2SitesSiteIdAppConfigsAppConfigIdResponseDefault>>;
    /**
     * Delete a specific app config
     *
     * @summary Delete an app config
     */
    deleteV2SitesSite_idApp_configsApp_config_id(metadata: types.DeleteV2SitesSiteIdAppConfigsAppConfigIdMetadataParam): Promise<FetchResponse<number, types.DeleteV2SitesSiteIdAppConfigsAppConfigIdResponseDefault>>;
    /**
     * Update a specific app config
     *
     * @summary Update an app config
     */
    patchV2SitesSite_idApp_configsApp_config_id(body: types.PatchV2SitesSiteIdAppConfigsAppConfigIdBodyParam, metadata: types.PatchV2SitesSiteIdAppConfigsAppConfigIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdAppConfigsAppConfigIdResponse200> | FetchResponse<number, types.PatchV2SitesSiteIdAppConfigsAppConfigIdResponseDefault>>;
    patchV2SitesSite_idApp_configsApp_config_id(metadata: types.PatchV2SitesSiteIdAppConfigsAppConfigIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdAppConfigsAppConfigIdResponse200> | FetchResponse<number, types.PatchV2SitesSiteIdAppConfigsAppConfigIdResponseDefault>>;
    /**
     * Retrieves a list of resources that represent the audio renditions created from
     * secondary/alternate audio tracks.
     *
     * @summary List audio renditions
     * @throws FetchError<404, types.GetV2SitesSiteIdMediaMediaIdOriginalsOriginalIdAudioTracksAudioTrackIdAudioRenditionsResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idMediaMedia_idOriginalsOriginal_idAudio_tracksAudio_track_idAudio_renditions(metadata: types.GetV2SitesSiteIdMediaMediaIdOriginalsOriginalIdAudioTracksAudioTrackIdAudioRenditionsMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdMediaMediaIdOriginalsOriginalIdAudioTracksAudioTrackIdAudioRenditionsResponse200>>;
    /**
     * Retrieves an audio rendition for any secondary/alternate audio track (any track except
     * for the default audio track). The default/primary audio track rendition can be found on
     * the [media renditions
     * resource](https://docs.jwplayer.com/platform/reference/get_v2-sites-site-id-media-media-id-media-renditions-rendition-id).
     *
     * @summary Get an audio rendition
     * @throws FetchError<404, types.GetV2SitesSiteIdMediaMediaIdOriginalsOriginalIdAudioTracksAudioTrackIdAudioRenditionsRenditionIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idMediaMedia_idOriginalsOriginal_idAudio_tracksAudio_track_idAudio_renditionsRendition_id(metadata: types.GetV2SitesSiteIdMediaMediaIdOriginalsOriginalIdAudioTracksAudioTrackIdAudioRenditionsRenditionIdMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdMediaMediaIdOriginalsOriginalIdAudioTracksAudioTrackIdAudioRenditionsRenditionIdResponse200>>;
    /**
     * Retrieves a list of audio tracks associated with the original
     *
     * @summary List audio tracks
     * @throws FetchError<404, types.GetV2SitesSiteIdMediaMediaIdOriginalsOriginalIdAudioTracksResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idMediaMedia_idOriginalsOriginal_idAudio_tracks(metadata: types.GetV2SitesSiteIdMediaMediaIdOriginalsOriginalIdAudioTracksMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdMediaMediaIdOriginalsOriginalIdAudioTracksResponse200>>;
    /**
     * Retrieves the details of a specific audio track
     *
     * @summary Get an audio track
     * @throws FetchError<404, types.GetV2SitesSiteIdMediaMediaIdOriginalsOriginalIdAudioTracksAudioTrackIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idMediaMedia_idOriginalsOriginal_idAudio_tracksAudio_track_id(metadata: types.GetV2SitesSiteIdMediaMediaIdOriginalsOriginalIdAudioTracksAudioTrackIdMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdMediaMediaIdOriginalsOriginalIdAudioTracksAudioTrackIdResponse200>>;
    /**
     * Updates the metadata of a specific audio track resource
     *
     * @summary Update an audio track
     * @throws FetchError<404, types.PatchV2SitesSiteIdMediaMediaIdOriginalsOriginalIdAudioTracksAudioTrackIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    patchV2SitesSite_idMediaMedia_idOriginalsOriginal_idAudio_tracksAudio_track_id(body: types.PatchV2SitesSiteIdMediaMediaIdOriginalsOriginalIdAudioTracksAudioTrackIdBodyParam, metadata: types.PatchV2SitesSiteIdMediaMediaIdOriginalsOriginalIdAudioTracksAudioTrackIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdMediaMediaIdOriginalsOriginalIdAudioTracksAudioTrackIdResponse200>>;
    patchV2SitesSite_idMediaMedia_idOriginalsOriginal_idAudio_tracksAudio_track_id(metadata: types.PatchV2SitesSiteIdMediaMediaIdOriginalsOriginalIdAudioTracksAudioTrackIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdMediaMediaIdOriginalsOriginalIdAudioTracksAudioTrackIdResponse200>>;
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
    deleteV2SitesSite_idMediaMedia_idOriginalsOriginal_idAudio_tracksAudio_track_id(metadata: types.DeleteV2SitesSiteIdMediaMediaIdOriginalsOriginalIdAudioTracksAudioTrackIdMetadataParam): Promise<FetchResponse<number, unknown>>;
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
    postV2SitesSite_idLiveBroadcastStreams(body: types.PostV2SitesSiteIdLiveBroadcastStreamsBodyParam, metadata: types.PostV2SitesSiteIdLiveBroadcastStreamsMetadataParam): Promise<FetchResponse<200, types.PostV2SitesSiteIdLiveBroadcastStreamsResponse200>>;
    /**
     * List all Broadcast Live streams for a site
     *
     * @summary List Broadcast Live streams
     * @throws FetchError<422, types.GetV2SitesSiteIdLiveBroadcastStreamsResponse422> Unprocessable Filter Parameters
     * @throws FetchError<502, types.GetV2SitesSiteIdLiveBroadcastStreamsResponse502> A lower level service failed to process request.
     */
    getV2SitesSite_idLiveBroadcastStreams(metadata: types.GetV2SitesSiteIdLiveBroadcastStreamsMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdLiveBroadcastStreamsResponse200>>;
    /**
     * Start a live stream
     *
     * The request is always accepted, but only executed when the live stream is in a state
     * that can be started.
     *
     * @summary Start a live stream
     * @throws FetchError<400, types.PutV2SitesSiteIdLiveBroadcastStreamsStreamIdStartResponse400> Invalid JSON request body
     */
    putV2SitesSite_idLiveBroadcastStreamsStream_idStart(metadata: types.PutV2SitesSiteIdLiveBroadcastStreamsStreamIdStartMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * Make a live stream available
     *
     * The request is always accepted, but only executed when the live stream is in a state
     * that can be made available.
     *
     * @summary Start a live stream
     * @throws FetchError<400, types.PutV2SitesSiteIdLiveBroadcastStreamsStreamIdGoLiveResponse400> Invalid JSON request body
     */
    putV2SitesSite_idLiveBroadcastStreamsStream_idGo_live(metadata: types.PutV2SitesSiteIdLiveBroadcastStreamsStreamIdGoLiveMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * Stop a live stream
     *
     * The request is always accepted but only executed when the live stream is in a state that
     * can be stopped.
     *
     * @summary Stop a live stream
     * @throws FetchError<400, types.PutV2SitesSiteIdLiveBroadcastStreamsStreamIdStopResponse400> Invalid JSON request body
     */
    putV2SitesSite_idLiveBroadcastStreamsStream_idStop(metadata: types.PutV2SitesSiteIdLiveBroadcastStreamsStreamIdStopMetadataParam): Promise<FetchResponse<number, unknown>>;
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
    putV2SitesSite_idLiveBroadcastStreamsStream_idDestroy(metadata: types.PutV2SitesSiteIdLiveBroadcastStreamsStreamIdDestroyMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * Assign a live ingest point to a live stream
     *
     * To replace or update the live ingest point, the existing one must be removed before
     * assigning a new one. The request is rejected if the live stream already has a live
     * ingest point assigned to it.
     *
     * @summary Assign a live ingest point
     * @throws FetchError<400, types.PutV2SitesSiteIdLiveBroadcastStreamsStreamIdSetIngestResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PutV2SitesSiteIdLiveBroadcastStreamsStreamIdSetIngestResponse404> Resource with ID supplied does not exist in account and object namespace
     * @throws FetchError<409, types.PutV2SitesSiteIdLiveBroadcastStreamsStreamIdSetIngestResponse409> Request conflicts with state of target resource
     * @throws FetchError<500, types.PutV2SitesSiteIdLiveBroadcastStreamsStreamIdSetIngestResponse500> A lower level service failed to process request.
     */
    putV2SitesSite_idLiveBroadcastStreamsStream_idSet_ingest(body: types.PutV2SitesSiteIdLiveBroadcastStreamsStreamIdSetIngestBodyParam, metadata: types.PutV2SitesSiteIdLiveBroadcastStreamsStreamIdSetIngestMetadataParam): Promise<FetchResponse<200, types.PutV2SitesSiteIdLiveBroadcastStreamsStreamIdSetIngestResponse200>>;
    putV2SitesSite_idLiveBroadcastStreamsStream_idSet_ingest(metadata: types.PutV2SitesSiteIdLiveBroadcastStreamsStreamIdSetIngestMetadataParam): Promise<FetchResponse<200, types.PutV2SitesSiteIdLiveBroadcastStreamsStreamIdSetIngestResponse200>>;
    /**
     * Unassign a live ingest point from a live stream
     *
     * The request is rejected if the live stream does not have a live ingest point assigned to
     * it.
     *
     * @summary Unassign a live ingest point
     * @throws FetchError<404, types.PutV2SitesSiteIdLiveBroadcastStreamsStreamIdRemoveIngestResponse404> Resource with ID supplied does not exist in account and object namespace
     * @throws FetchError<409, types.PutV2SitesSiteIdLiveBroadcastStreamsStreamIdRemoveIngestResponse409> Request conflicts with state of target resource
     * @throws FetchError<500, types.PutV2SitesSiteIdLiveBroadcastStreamsStreamIdRemoveIngestResponse500> A lower level service failed to process request.
     */
    putV2SitesSite_idLiveBroadcastStreamsStream_idRemove_ingest(body: types.PutV2SitesSiteIdLiveBroadcastStreamsStreamIdRemoveIngestBodyParam, metadata: types.PutV2SitesSiteIdLiveBroadcastStreamsStreamIdRemoveIngestMetadataParam): Promise<FetchResponse<200, types.PutV2SitesSiteIdLiveBroadcastStreamsStreamIdRemoveIngestResponse200>>;
    putV2SitesSite_idLiveBroadcastStreamsStream_idRemove_ingest(metadata: types.PutV2SitesSiteIdLiveBroadcastStreamsStreamIdRemoveIngestMetadataParam): Promise<FetchResponse<200, types.PutV2SitesSiteIdLiveBroadcastStreamsStreamIdRemoveIngestResponse200>>;
    /**
     * Update a selection of live stream properties
     *
     * @summary Update properties of a live stream
     * @throws FetchError<400, types.PatchV2SitesSiteIdLiveBroadcastStreamsStreamIdResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PatchV2SitesSiteIdLiveBroadcastStreamsStreamIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    patchV2SitesSite_idLiveBroadcastStreamsStream_id(body: types.PatchV2SitesSiteIdLiveBroadcastStreamsStreamIdBodyParam, metadata: types.PatchV2SitesSiteIdLiveBroadcastStreamsStreamIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdLiveBroadcastStreamsStreamIdResponse200>>;
    patchV2SitesSite_idLiveBroadcastStreamsStream_id(metadata: types.PatchV2SitesSiteIdLiveBroadcastStreamsStreamIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdLiveBroadcastStreamsStreamIdResponse200>>;
    /**
     * Retrieve the details of a specific live stream
     *
     * @summary Get a live stream
     * @throws FetchError<404, types.GetV2SitesSiteIdLiveBroadcastStreamsStreamIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idLiveBroadcastStreamsStream_id(metadata: types.GetV2SitesSiteIdLiveBroadcastStreamsStreamIdMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdLiveBroadcastStreamsStreamIdResponse200>>;
    /**
     * Create a new media object that is a subsection of an existing media
     *
     * @summary Create a clip
     * @throws FetchError<400, types.PutV2SitesSiteIdLiveBroadcastStreamsMediaIdClipResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PutV2SitesSiteIdLiveBroadcastStreamsMediaIdClipResponse404> Resource with ID supplied does not exist in account and object namespace
     * @throws FetchError<502, types.PutV2SitesSiteIdLiveBroadcastStreamsMediaIdClipResponse502> A lower level service failed to process request.
     */
    putV2SitesSite_idLiveBroadcastStreamsMedia_idClip(body: types.PutV2SitesSiteIdLiveBroadcastStreamsMediaIdClipBodyParam, metadata: types.PutV2SitesSiteIdLiveBroadcastStreamsMediaIdClipMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * List all Broadcast stream configs for a site
     *
     * @summary List Broadcast stream configs
     * @throws FetchError<422, types.GetV2SitesSiteIdLiveBroadcastStreamConfigsResponse422> Unprocessable Filter Parameters
     * @throws FetchError<502, types.GetV2SitesSiteIdLiveBroadcastStreamConfigsResponse502> A lower level service failed to process request.
     */
    getV2SitesSite_idLiveBroadcastStream_configs(metadata: types.GetV2SitesSiteIdLiveBroadcastStreamConfigsMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdLiveBroadcastStreamConfigsResponse200>>;
    /**
     * Retrieve the details of a specific stream config
     *
     * @summary Get a stream config
     * @throws FetchError<404, types.GetV2SitesSiteIdLiveBroadcastStreamConfigsConfigIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idLiveBroadcastStream_configsConfig_id(metadata: types.GetV2SitesSiteIdLiveBroadcastStreamConfigsConfigIdMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdLiveBroadcastStreamConfigsConfigIdResponse200>>;
    /**
     * Retrieve the details of a default stream config
     *
     * A single default config can exist per site and is not returned in other queries.
     *
     * @summary Get the default stream config for a site
     * @throws FetchError<404, types.GetV2SitesSiteIdLiveBroadcastStreamConfigsDefaultResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idLiveBroadcastStream_configsDefault(metadata: types.GetV2SitesSiteIdLiveBroadcastStreamConfigsDefaultMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdLiveBroadcastStreamConfigsDefaultResponse200>>;
    /**
     * List all Broadcast Live ingest points for a site
     *
     * @summary List Broadcast Live ingest points
     * @throws FetchError<422, types.GetV2SitesSiteIdLiveBroadcastIngestResponse422> Unprocessable Filter Parameters
     * @throws FetchError<502, types.GetV2SitesSiteIdLiveBroadcastIngestResponse502> A lower level service failed to process request.
     */
    getV2SitesSite_idLiveBroadcastIngest(metadata: types.GetV2SitesSiteIdLiveBroadcastIngestMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdLiveBroadcastIngestResponse200>>;
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
    postV2SitesSite_idLiveBroadcastIngest(body: types.PostV2SitesSiteIdLiveBroadcastIngestBodyParam, metadata: types.PostV2SitesSiteIdLiveBroadcastIngestMetadataParam): Promise<FetchResponse<200, types.PostV2SitesSiteIdLiveBroadcastIngestResponse200>>;
    /**
     * List the availabilities of Broadcast Live ingest points for a specific format between
     * two dates
     *
     * @summary List ingest point availability
     * @throws FetchError<400, types.GetV2SitesSiteIdLiveBroadcastIngestAvailabilityResponse400> Invalid JSON request body
     * @throws FetchError<404, types.GetV2SitesSiteIdLiveBroadcastIngestAvailabilityResponse404> Resource with ID supplied does not exist in account and object namespace
     * @throws FetchError<502, types.GetV2SitesSiteIdLiveBroadcastIngestAvailabilityResponse502> A lower level service failed to process request.
     */
    getV2SitesSite_idLiveBroadcastIngestAvailability(metadata: types.GetV2SitesSiteIdLiveBroadcastIngestAvailabilityMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdLiveBroadcastIngestAvailabilityResponse200>>;
    /**
     * Retrieve the details of a specific live ingest point
     *
     * @summary Get a live ingest point
     * @throws FetchError<404, types.GetV2SitesSiteIdLiveBroadcastIngestIngestIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idLiveBroadcastIngestIngest_id(metadata: types.GetV2SitesSiteIdLiveBroadcastIngestIngestIdMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdLiveBroadcastIngestIngestIdResponse200>>;
    /**
     * Deletes a specific live ingest point if not in use or scheduled to be used
     *
     * @summary Delete a live ingest point
     * @throws FetchError<404, types.DeleteV2SitesSiteIdLiveBroadcastIngestIngestIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    deleteV2SitesSite_idLiveBroadcastIngestIngest_id(metadata: types.DeleteV2SitesSiteIdLiveBroadcastIngestIngestIdMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * Update the display name of a specific live ingest point
     *
     * @summary Update the display name of a live ingest point
     * @throws FetchError<400, types.PatchV2SitesSiteIdLiveBroadcastIngestIngestIdResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PatchV2SitesSiteIdLiveBroadcastIngestIngestIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    patchV2SitesSite_idLiveBroadcastIngestIngest_id(body: types.PatchV2SitesSiteIdLiveBroadcastIngestIngestIdBodyParam, metadata: types.PatchV2SitesSiteIdLiveBroadcastIngestIngestIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdLiveBroadcastIngestIngestIdResponse200>>;
    /**
     * List all Broadcast Live streams for a live ingest point
     *
     * @summary List streams for an ingest point
     * @throws FetchError<422, types.GetV2SitesSiteIdLiveBroadcastIngestIngestIdStreamsResponse422> Unprocessable Filter Parameters
     * @throws FetchError<502, types.GetV2SitesSiteIdLiveBroadcastIngestIngestIdStreamsResponse502> A lower level service failed to process request.
     */
    getV2SitesSite_idLiveBroadcastIngestIngest_idStreams(metadata: types.GetV2SitesSiteIdLiveBroadcastIngestIngestIdStreamsMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdLiveBroadcastIngestIngestIdStreamsResponse200>>;
    /**
     * Create a new secret for a site
     *
     * Each secret represents a passphrase or key used for securing live streams.
     *
     * @summary Create a new secret
     * @throws FetchError<400, types.PostV2SitesSiteIdLiveBroadcastSecretsResponse400> Invalid JSON request body
     * @throws FetchError<500, types.PostV2SitesSiteIdLiveBroadcastSecretsResponse500> Internal server error
     */
    postV2SitesSite_idLiveBroadcastSecrets(body: types.PostV2SitesSiteIdLiveBroadcastSecretsBodyParam, metadata: types.PostV2SitesSiteIdLiveBroadcastSecretsMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdLiveBroadcastSecretsResponse201>>;
    postV2SitesSite_idLiveBroadcastSecrets(metadata: types.PostV2SitesSiteIdLiveBroadcastSecretsMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdLiveBroadcastSecretsResponse201>>;
    /**
     * List all secrets for a site
     *
     * Each secret represents a passphrase or key used for securing live streams.
     *
     * @summary List secrets
     * @throws FetchError<404, types.GetV2SitesSiteIdLiveBroadcastSecretsResponse404> Resource with ID supplied does not exist in account and object namespace
     * @throws FetchError<500, types.GetV2SitesSiteIdLiveBroadcastSecretsResponse500> Internal server error
     */
    getV2SitesSite_idLiveBroadcastSecrets(metadata: types.GetV2SitesSiteIdLiveBroadcastSecretsMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdLiveBroadcastSecretsResponse200>>;
    /**
     * Retrieve the details of a specific secret
     *
     * A secret represents a passphrase or key used for securing live streams.
     *
     * @summary Get a secret
     * @throws FetchError<404, types.GetV2SitesSiteIdLiveBroadcastSecretsSecretIdResponse404> Resource with ID supplied does not exist in account and object namespace
     * @throws FetchError<500, types.GetV2SitesSiteIdLiveBroadcastSecretsSecretIdResponse500> Internal server error
     */
    getV2SitesSite_idLiveBroadcastSecretsSecret_id(metadata: types.GetV2SitesSiteIdLiveBroadcastSecretsSecretIdMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdLiveBroadcastSecretsSecretIdResponse200>>;
    /**
     * Update an existing secret's name and/or content
     *
     * Note: Secrets cannot be updated while in use by active LiveStreams.
     *
     * @summary Update a secret
     * @throws FetchError<400, types.PatchV2SitesSiteIdLiveBroadcastSecretsSecretIdResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PatchV2SitesSiteIdLiveBroadcastSecretsSecretIdResponse404> Resource with ID supplied does not exist in account and object namespace
     * @throws FetchError<500, types.PatchV2SitesSiteIdLiveBroadcastSecretsSecretIdResponse500> Internal server error
     */
    patchV2SitesSite_idLiveBroadcastSecretsSecret_id(body: types.PatchV2SitesSiteIdLiveBroadcastSecretsSecretIdBodyParam, metadata: types.PatchV2SitesSiteIdLiveBroadcastSecretsSecretIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdLiveBroadcastSecretsSecretIdResponse200>>;
    patchV2SitesSite_idLiveBroadcastSecretsSecret_id(metadata: types.PatchV2SitesSiteIdLiveBroadcastSecretsSecretIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdLiveBroadcastSecretsSecretIdResponse200>>;
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
    deleteV2SitesSite_idLiveBroadcastSecretsSecret_id(metadata: types.DeleteV2SitesSiteIdLiveBroadcastSecretsSecretIdMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * List all content type schemas for a site
     *
     * Content types streamline the tasks of content editors, like managing media metadata, by
     * automatically displaying the necessary fields in the JWX dashboard. This applies to
     * various content types such as concerts, teams, matches, venues, and more.
     *
     * @summary List schemas
     */
    getV2SitesSite_idContent_type_schemas(metadata: types.GetV2SitesSiteIdContentTypeSchemasMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdContentTypeSchemasResponse200>>;
    /**
     * Create a new schema for a site
     *
     * @summary Create schema
     */
    postV2SitesSite_idContent_type_schemas(body: types.PostV2SitesSiteIdContentTypeSchemasBodyParam, metadata: types.PostV2SitesSiteIdContentTypeSchemasMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdContentTypeSchemasResponse201> | FetchResponse<number, types.PostV2SitesSiteIdContentTypeSchemasResponseDefault>>;
    /**
     * Delete a specific schema
     *
     * @summary Delete a schema
     */
    deleteV2SitesSite_idContent_type_schemasSchema_id(metadata: types.DeleteV2SitesSiteIdContentTypeSchemasSchemaIdMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * Retrieve the details of a specific schema
     *
     * @summary Get a schema
     */
    getV2SitesSite_idContent_type_schemasSchema_id(metadata: types.GetV2SitesSiteIdContentTypeSchemasSchemaIdMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdContentTypeSchemasSchemaIdResponse200> | FetchResponse<number, types.GetV2SitesSiteIdContentTypeSchemasSchemaIdResponseDefault>>;
    /**
     * Update a specific schema
     *
     * @summary Update a schema
     */
    patchV2SitesSite_idContent_type_schemasSchema_id(body: types.PatchV2SitesSiteIdContentTypeSchemasSchemaIdBodyParam, metadata: types.PatchV2SitesSiteIdContentTypeSchemasSchemaIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdContentTypeSchemasSchemaIdResponse200>>;
    /**
     * Retrieves a list of custom audio renditions
     *
     * @summary Retrieve list of custom audio renditions
     */
    getV2SitesSite_idMediaMedia_idCustom_audio_renditions(metadata: types.GetV2SitesSiteIdMediaMediaIdCustomAudioRenditionsMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdMediaMediaIdCustomAudioRenditionsResponse200>>;
    /**
     * Creates a new custom audio rendition. This is only applicable to
     * [media](https://docs.jwplayer.com/platform/reference/post_v2-sites-site-id-media) with a
     * `renditions` hosting type.
     *
     * Renditions must adhere to [custom renditions
     * guidelines](https://docs.jwplayer.com/platform/docs/bring-your-own-renditions#custom-renditions-guidelines).
     *
     * @summary Create a custom audio rendition
     * @throws FetchError<400, types.PostV2SitesSiteIdMediaMediaIdCustomAudioRenditionsResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PostV2SitesSiteIdMediaMediaIdCustomAudioRenditionsResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    postV2SitesSite_idMediaMedia_idCustom_audio_renditions(body: types.PostV2SitesSiteIdMediaMediaIdCustomAudioRenditionsBodyParam, metadata: types.PostV2SitesSiteIdMediaMediaIdCustomAudioRenditionsMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdMediaMediaIdCustomAudioRenditionsResponse201>>;
    postV2SitesSite_idMediaMedia_idCustom_audio_renditions(metadata: types.PostV2SitesSiteIdMediaMediaIdCustomAudioRenditionsMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdMediaMediaIdCustomAudioRenditionsResponse201>>;
    /**
     * Retrieves a custom audio rendition
     *
     * @summary Retrieve a custom audio rendition
     * @throws FetchError<404, types.GetV2SitesSiteIdMediaMediaIdCustomAudioRenditionsRenditionIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idMediaMedia_idCustom_audio_renditionsRendition_id(metadata: types.GetV2SitesSiteIdMediaMediaIdCustomAudioRenditionsRenditionIdMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdMediaMediaIdCustomAudioRenditionsRenditionIdResponse200>>;
    /**
     * Updates an existing custom audio rendition
     *
     * @summary Update a custom audio rendition
     * @throws FetchError<400, types.PatchV2SitesSiteIdMediaMediaIdCustomAudioRenditionsRenditionIdResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PatchV2SitesSiteIdMediaMediaIdCustomAudioRenditionsRenditionIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    patchV2SitesSite_idMediaMedia_idCustom_audio_renditionsRendition_id(body: types.PatchV2SitesSiteIdMediaMediaIdCustomAudioRenditionsRenditionIdBodyParam, metadata: types.PatchV2SitesSiteIdMediaMediaIdCustomAudioRenditionsRenditionIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdMediaMediaIdCustomAudioRenditionsRenditionIdResponse200>>;
    patchV2SitesSite_idMediaMedia_idCustom_audio_renditionsRendition_id(metadata: types.PatchV2SitesSiteIdMediaMediaIdCustomAudioRenditionsRenditionIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdMediaMediaIdCustomAudioRenditionsRenditionIdResponse200>>;
    /**
     * Deletes a custom audio rendition resource by ID
     *
     * @summary Delete a custom audio rendition
     * @throws FetchError<404, types.DeleteV2SitesSiteIdMediaMediaIdCustomAudioRenditionsRenditionIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    deleteV2SitesSite_idMediaMedia_idCustom_audio_renditionsRendition_id(metadata: types.DeleteV2SitesSiteIdMediaMediaIdCustomAudioRenditionsRenditionIdMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * Retrieves a list of custom text renditions
     *
     * @summary Retrieve list of custom text renditions
     */
    getV2SitesSite_idMediaMedia_idCustom_text_renditions(metadata: types.GetV2SitesSiteIdMediaMediaIdCustomTextRenditionsMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdMediaMediaIdCustomTextRenditionsResponse200>>;
    /**
     * Creates a new custom text rendition. This is only applicable to
     * [media](https://docs.jwplayer.com/platform/reference/post_v2-sites-site-id-media) with a
     * `renditions` hosting type.
     *
     * Renditions must adhere to [custom renditions
     * guidelines](https://docs.jwplayer.com/platform/docs/bring-your-own-renditions#custom-renditions-guidelines).
     *
     * @summary Create a custom text rendition
     * @throws FetchError<400, types.PostV2SitesSiteIdMediaMediaIdCustomTextRenditionsResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PostV2SitesSiteIdMediaMediaIdCustomTextRenditionsResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    postV2SitesSite_idMediaMedia_idCustom_text_renditions(body: types.PostV2SitesSiteIdMediaMediaIdCustomTextRenditionsBodyParam, metadata: types.PostV2SitesSiteIdMediaMediaIdCustomTextRenditionsMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdMediaMediaIdCustomTextRenditionsResponse201>>;
    postV2SitesSite_idMediaMedia_idCustom_text_renditions(metadata: types.PostV2SitesSiteIdMediaMediaIdCustomTextRenditionsMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdMediaMediaIdCustomTextRenditionsResponse201>>;
    /**
     * Retrieves a custom text rendition
     *
     * @summary Retrieve a custom text rendition
     * @throws FetchError<404, types.GetV2SitesSiteIdMediaMediaIdCustomTextRenditionsRenditionIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idMediaMedia_idCustom_text_renditionsRendition_id(metadata: types.GetV2SitesSiteIdMediaMediaIdCustomTextRenditionsRenditionIdMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdMediaMediaIdCustomTextRenditionsRenditionIdResponse200>>;
    /**
     * Updates an existing custom text rendition
     *
     * @summary Update a custom text rendition
     * @throws FetchError<400, types.PatchV2SitesSiteIdMediaMediaIdCustomTextRenditionsRenditionIdResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PatchV2SitesSiteIdMediaMediaIdCustomTextRenditionsRenditionIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    patchV2SitesSite_idMediaMedia_idCustom_text_renditionsRendition_id(body: types.PatchV2SitesSiteIdMediaMediaIdCustomTextRenditionsRenditionIdBodyParam, metadata: types.PatchV2SitesSiteIdMediaMediaIdCustomTextRenditionsRenditionIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdMediaMediaIdCustomTextRenditionsRenditionIdResponse200>>;
    patchV2SitesSite_idMediaMedia_idCustom_text_renditionsRendition_id(metadata: types.PatchV2SitesSiteIdMediaMediaIdCustomTextRenditionsRenditionIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdMediaMediaIdCustomTextRenditionsRenditionIdResponse200>>;
    /**
     * Deletes a custom text rendition resource by ID
     *
     * @summary Delete a custom text rendition
     * @throws FetchError<404, types.DeleteV2SitesSiteIdMediaMediaIdCustomTextRenditionsRenditionIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    deleteV2SitesSite_idMediaMedia_idCustom_text_renditionsRendition_id(metadata: types.DeleteV2SitesSiteIdMediaMediaIdCustomTextRenditionsRenditionIdMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * Retrieves a list of custom video renditions
     *
     * @summary Retrieve list of custom video renditions
     */
    getV2SitesSite_idMediaMedia_idCustom_video_renditions(metadata: types.GetV2SitesSiteIdMediaMediaIdCustomVideoRenditionsMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdMediaMediaIdCustomVideoRenditionsResponse200>>;
    /**
     * Creates a new custom video rendition. This is only applicable to
     * [media](https://docs.jwplayer.com/platform/reference/post_v2-sites-site-id-media) with a
     * `renditions` hosting type.
     *
     * Renditions must adhere to [custom renditions
     * guidelines](https://docs.jwplayer.com/platform/docs/bring-your-own-renditions#custom-renditions-guidelines).
     *
     * @summary Create a custom video rendition
     * @throws FetchError<400, types.PostV2SitesSiteIdMediaMediaIdCustomVideoRenditionsResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PostV2SitesSiteIdMediaMediaIdCustomVideoRenditionsResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    postV2SitesSite_idMediaMedia_idCustom_video_renditions(body: types.PostV2SitesSiteIdMediaMediaIdCustomVideoRenditionsBodyParam, metadata: types.PostV2SitesSiteIdMediaMediaIdCustomVideoRenditionsMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdMediaMediaIdCustomVideoRenditionsResponse201>>;
    postV2SitesSite_idMediaMedia_idCustom_video_renditions(metadata: types.PostV2SitesSiteIdMediaMediaIdCustomVideoRenditionsMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdMediaMediaIdCustomVideoRenditionsResponse201>>;
    /**
     * Retrieves a custom video rendition
     *
     * @summary Retrieve a custom video rendition
     * @throws FetchError<404, types.GetV2SitesSiteIdMediaMediaIdCustomVideoRenditionsRenditionIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idMediaMedia_idCustom_video_renditionsRendition_id(metadata: types.GetV2SitesSiteIdMediaMediaIdCustomVideoRenditionsRenditionIdMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdMediaMediaIdCustomVideoRenditionsRenditionIdResponse200>>;
    /**
     * Deletes a custom video rendition resource by ID
     *
     * @summary Delete a custom video rendition
     * @throws FetchError<404, types.DeleteV2SitesSiteIdMediaMediaIdCustomVideoRenditionsRenditionIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    deleteV2SitesSite_idMediaMedia_idCustom_video_renditionsRendition_id(metadata: types.DeleteV2SitesSiteIdMediaMediaIdCustomVideoRenditionsRenditionIdMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * Creates a DRM policy for a site
     *
     * @summary Creates a DRM policy
     * @throws FetchError<400, types.PostV2SitesSiteIdDrmPoliciesResponse400> Invalid JSON request body
     */
    postV2SitesSite_idDrm_policies(body: types.PostV2SitesSiteIdDrmPoliciesBodyParam, metadata: types.PostV2SitesSiteIdDrmPoliciesMetadataParam): Promise<FetchResponse<200, types.PostV2SitesSiteIdDrmPoliciesResponse200>>;
    postV2SitesSite_idDrm_policies(metadata: types.PostV2SitesSiteIdDrmPoliciesMetadataParam): Promise<FetchResponse<200, types.PostV2SitesSiteIdDrmPoliciesResponse200>>;
    /**
     * Lists DRM policies for a site
     *
     * @summary List DRM policies
     * @throws FetchError<400, types.GetV2SitesSiteIdDrmPoliciesResponse400> Invalid JSON request body
     */
    getV2SitesSite_idDrm_policies(metadata: types.GetV2SitesSiteIdDrmPoliciesMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdDrmPoliciesResponse200>>;
    /**
     * Fetches DRM policy details
     *
     * @summary Get a DRM policy
     * @throws FetchError<404, types.GetV2SitesSiteIdDrmPoliciesPolicyIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idDrm_policiesPolicy_id(metadata: types.GetV2SitesSiteIdDrmPoliciesPolicyIdMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdDrmPoliciesPolicyIdResponse200>>;
    /**
     * Update properties of a DRM policy
     *
     * @summary Update a DRM policy
     * @throws FetchError<400, types.PatchV2SitesSiteIdDrmPoliciesPolicyIdResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PatchV2SitesSiteIdDrmPoliciesPolicyIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    patchV2SitesSite_idDrm_policiesPolicy_id(body: types.PatchV2SitesSiteIdDrmPoliciesPolicyIdBodyParam, metadata: types.PatchV2SitesSiteIdDrmPoliciesPolicyIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdDrmPoliciesPolicyIdResponse200>>;
    patchV2SitesSite_idDrm_policiesPolicy_id(metadata: types.PatchV2SitesSiteIdDrmPoliciesPolicyIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdDrmPoliciesPolicyIdResponse200>>;
    /**
     * Delete a given DRM policy
     *
     * @summary Delete a DRM policy
     * @throws FetchError<404, types.DeleteV2SitesSiteIdDrmPoliciesPolicyIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    deleteV2SitesSite_idDrm_policiesPolicy_id(metadata: types.DeleteV2SitesSiteIdDrmPoliciesPolicyIdMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * Before you can upload a new image, you need to create a new image first. This endpoint
     * allows you to create a new image resource. In the response, you'll receive `upload_link`
     * or `upload_id` and `upload_token` depending on the `upload.method` provided.
     * **NOTE:** If the site already has 40 unique labels, a request to create an image with a
     * new label will be rejected.
     *
     * @summary Create an additional image for media
     */
    postV2SitesSite_idMediaMedia_idImages(body: types.PostV2SitesSiteIdMediaMediaIdImagesBodyParam, metadata: types.PostV2SitesSiteIdMediaMediaIdImagesMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdMediaMediaIdImagesResponse201> | FetchResponse<number, types.PostV2SitesSiteIdMediaMediaIdImagesResponseDefault>>;
    postV2SitesSite_idMediaMedia_idImages(metadata: types.PostV2SitesSiteIdMediaMediaIdImagesMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdMediaMediaIdImagesResponse201> | FetchResponse<number, types.PostV2SitesSiteIdMediaMediaIdImagesResponseDefault>>;
    /**
     * Get a list of all images for this media
     *
     * @summary List additional images for media
     */
    getV2SitesSite_idMediaMedia_idImages(metadata: types.GetV2SitesSiteIdMediaMediaIdImagesMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdMediaMediaIdImagesResponse200> | FetchResponse<number, types.GetV2SitesSiteIdMediaMediaIdImagesResponseDefault>>;
    /**
     * Request details for an image resource with a specific image ID
     *
     * @summary Get an additional image
     */
    getV2SitesSite_idMediaMedia_idImagesImage_id(metadata: types.GetV2SitesSiteIdMediaMediaIdImagesImageIdMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdMediaMediaIdImagesImageIdResponse200> | FetchResponse<number, types.GetV2SitesSiteIdMediaMediaIdImagesImageIdResponseDefault>>;
    /**
     * Update an image resource with a specific image ID
     *
     * @summary Update an additional image
     */
    patchV2SitesSite_idMediaMedia_idImagesImage_id(body: types.PatchV2SitesSiteIdMediaMediaIdImagesImageIdBodyParam, metadata: types.PatchV2SitesSiteIdMediaMediaIdImagesImageIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdMediaMediaIdImagesImageIdResponse200> | FetchResponse<number, types.PatchV2SitesSiteIdMediaMediaIdImagesImageIdResponseDefault>>;
    patchV2SitesSite_idMediaMedia_idImagesImage_id(metadata: types.PatchV2SitesSiteIdMediaMediaIdImagesImageIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdMediaMediaIdImagesImageIdResponse200> | FetchResponse<number, types.PatchV2SitesSiteIdMediaMediaIdImagesImageIdResponseDefault>>;
    /**
     * Delete an image resource with a specific image ID
     *
     * @summary Delete an additional image
     */
    deleteV2SitesSite_idMediaMedia_idImagesImage_id(metadata: types.DeleteV2SitesSiteIdMediaMediaIdImagesImageIdMetadataParam): Promise<FetchResponse<number, types.DeleteV2SitesSiteIdMediaMediaIdImagesImageIdResponseDefault>>;
    /**
     * List MRSS import sources
     *
     * @summary List imports
     * @throws FetchError<400, types.GetV2SitesSiteIdImportsResponse400> Invalid JSON request body
     */
    getV2SitesSite_idImports(metadata: types.GetV2SitesSiteIdImportsMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdImportsResponse200>>;
    /**
     * Creates an import source to this site
     *
     * Learn more about how to [set up an MRSS import
     * feed](https://docs.jwplayer.com/jwplayer/docs/stream-set-up-an-mrss-import-feed )
     *
     * @summary Create an import
     * @throws FetchError<400, types.PostV2SitesSiteIdImportsResponse400> Invalid JSON request body
     */
    postV2SitesSite_idImports(body: types.PostV2SitesSiteIdImportsBodyParam, metadata: types.PostV2SitesSiteIdImportsMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdImportsResponse201>>;
    postV2SitesSite_idImports(metadata: types.PostV2SitesSiteIdImportsMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdImportsResponse201>>;
    /**
     * Get MRSS import source
     *
     * @summary Get an import
     * @throws FetchError<400, types.GetV2SitesSiteIdImportsImportIdResponse400> Invalid JSON request body
     * @throws FetchError<404, types.GetV2SitesSiteIdImportsImportIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idImportsImport_id(metadata: types.GetV2SitesSiteIdImportsImportIdMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdImportsImportIdResponse200>>;
    /**
     * Update MRSS import source
     *
     * @summary Update an import
     * @throws FetchError<400, types.PatchV2SitesSiteIdImportsImportIdResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PatchV2SitesSiteIdImportsImportIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    patchV2SitesSite_idImportsImport_id(body: types.PatchV2SitesSiteIdImportsImportIdBodyParam, metadata: types.PatchV2SitesSiteIdImportsImportIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdImportsImportIdResponse200>>;
    patchV2SitesSite_idImportsImport_id(metadata: types.PatchV2SitesSiteIdImportsImportIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdImportsImportIdResponse200>>;
    /**
     * Delete MRSS import source
     *
     * @summary Delete an import
     * @throws FetchError<404, types.DeleteV2SitesSiteIdImportsImportIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    deleteV2SitesSite_idImportsImport_id(metadata: types.DeleteV2SitesSiteIdImportsImportIdMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * Get a list of all live channels
     *
     * @summary List live channels
     * @throws FetchError<400, types.GetV2SitesSiteIdChannelsResponse400> Invalid JSON request body
     */
    getV2SitesSite_idChannels(metadata: types.GetV2SitesSiteIdChannelsMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdChannelsResponse200>>;
    /**
     * Create a live channel
     *
     * @summary Create a live channel
     * @throws FetchError<400, types.PostV2SitesSiteIdChannelsResponse400> Invalid JSON request body
     */
    postV2SitesSite_idChannels(body: types.PostV2SitesSiteIdChannelsBodyParam, metadata: types.PostV2SitesSiteIdChannelsMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdChannelsResponse201>>;
    postV2SitesSite_idChannels(metadata: types.PostV2SitesSiteIdChannelsMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdChannelsResponse201>>;
    /**
     * Get a live channel
     *
     * @summary Get a live channel
     * @throws FetchError<404, types.GetV2SitesSiteIdChannelsChannelIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idChannelsChannel_id(metadata: types.GetV2SitesSiteIdChannelsChannelIdMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdChannelsChannelIdResponse200>>;
    /**
     * Delete a live channel
     *
     * @summary Delete a live channel
     * @throws FetchError<404, types.DeleteV2SitesSiteIdChannelsChannelIdResponse404> Resource with ID supplied does not exist in account and object namespace
     * @throws FetchError<409, types.DeleteV2SitesSiteIdChannelsChannelIdResponse409> Request conflicts with state of target resource
     */
    deleteV2SitesSite_idChannelsChannel_id(metadata: types.DeleteV2SitesSiteIdChannelsChannelIdMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * Updates live channel metadata and settings, such as the content protection rule, DVR,
     * latency, publishing mode, reconnect window, simulcast targets, and text tracks
     * (captions, subtitles)
     *
     * @summary Update a live channel
     * @throws FetchError<404, types.PatchV2SitesSiteIdChannelsChannelIdResponse404> Resource with ID supplied does not exist in account and object namespace
     * @throws FetchError<409, types.PatchV2SitesSiteIdChannelsChannelIdResponse409> Request conflicts with state of target resource
     */
    patchV2SitesSite_idChannelsChannel_id(body: types.PatchV2SitesSiteIdChannelsChannelIdBodyParam, metadata: types.PatchV2SitesSiteIdChannelsChannelIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdChannelsChannelIdResponse200>>;
    patchV2SitesSite_idChannelsChannel_id(metadata: types.PatchV2SitesSiteIdChannelsChannelIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdChannelsChannelIdResponse200>>;
    /**
     * Disables the channel and makes it unavailable for ingest and playback.
     *
     * @summary Disable the channel
     * @throws FetchError<404, types.PutV2SitesSiteIdChannelsChannelIdDisableResponse404> Invalid JSON request body
     */
    putV2SitesSite_idChannelsChannel_idDisable(metadata: types.PutV2SitesSiteIdChannelsChannelIdDisableMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * Enables the channels and makes it available for ingest and playback.
     *
     * @summary Enable the channel
     * @throws FetchError<404, types.PutV2SitesSiteIdChannelsChannelIdEnableResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    putV2SitesSite_idChannelsChannel_idEnable(metadata: types.PutV2SitesSiteIdChannelsChannelIdEnableMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * Get a list of events that belong to a live channel
     *
     * @summary List live events
     * @throws FetchError<400, types.GetV2SitesSiteIdChannelsChannelIdEventsResponse400> Invalid JSON request body
     * @throws FetchError<404, types.GetV2SitesSiteIdChannelsChannelIdEventsResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idChannelsChannel_idEvents(metadata: types.GetV2SitesSiteIdChannelsChannelIdEventsMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdChannelsChannelIdEventsResponse200>>;
    /**
     * Get details for an event of a live channel
     *
     * @summary Get a live event
     * @throws FetchError<404, types.GetV2SitesSiteIdChannelsChannelIdEventsEventIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idChannelsChannel_idEventsEvent_id(metadata: types.GetV2SitesSiteIdChannelsChannelIdEventsEventIdMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdChannelsChannelIdEventsEventIdResponse200>>;
    /**
     * Create a video on demand (VOD) asset by clipping the event with `event_id`. The
     * beginning and end times of the clip must be specified in the payload. The new VOD asset
     * inherits tags and custom parameters from the channel.
     *
     * @summary Create a VOD asset by clipping an event
     * @throws FetchError<400, types.PutV2SitesSiteIdChannelsChannelIdEventsEventIdClipResponse400> Invalid JSON request body
     * @throws FetchError<403, types.PutV2SitesSiteIdChannelsChannelIdEventsEventIdClipResponse403> Action forbidden.
     * @throws FetchError<404, types.PutV2SitesSiteIdChannelsChannelIdEventsEventIdClipResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    putV2SitesSite_idChannelsChannel_idEventsEvent_idClip(body: types.PutV2SitesSiteIdChannelsChannelIdEventsEventIdClipBodyParam, metadata: types.PutV2SitesSiteIdChannelsChannelIdEventsEventIdClipMetadataParam): Promise<FetchResponse<201, types.PutV2SitesSiteIdChannelsChannelIdEventsEventIdClipResponse201>>;
    putV2SitesSite_idChannelsChannel_idEventsEvent_idClip(metadata: types.PutV2SitesSiteIdChannelsChannelIdEventsEventIdClipMetadataParam): Promise<FetchResponse<201, types.PutV2SitesSiteIdChannelsChannelIdEventsEventIdClipResponse201>>;
    /**
     * Publish the event to the end-users.
     *
     * @summary Publish the event
     * @throws FetchError<404, types.PutV2SitesSiteIdChannelsChannelIdEventsEventIdPublishResponse404> Resource with ID supplied does not exist in account and object namespace
     * @throws FetchError<409, types.PutV2SitesSiteIdChannelsChannelIdEventsEventIdPublishResponse409> Request conflicts with state of target resource
     */
    putV2SitesSite_idChannelsChannel_idEventsEvent_idPublish(metadata: types.PutV2SitesSiteIdChannelsChannelIdEventsEventIdPublishMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * List media
     *
     * @summary List media
     * @throws FetchError<400, types.GetV2SitesSiteIdMediaResponse400> Invalid JSON request body
     */
    getV2SitesSite_idMedia(metadata: types.GetV2SitesSiteIdMediaMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdMediaResponse200>>;
    /**
     * Create a media
     *
     * @summary Create a media
     * @throws FetchError<400, types.PostV2SitesSiteIdMediaResponse400> Invalid JSON request body
     */
    postV2SitesSite_idMedia(body: types.PostV2SitesSiteIdMediaBodyParam, metadata: types.PostV2SitesSiteIdMediaMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdMediaResponse201>>;
    postV2SitesSite_idMedia(metadata: types.PostV2SitesSiteIdMediaMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdMediaResponse201>>;
    /**
     * Get a media
     *
     * @summary Get a media
     * @throws FetchError<404, types.GetV2SitesSiteIdMediaMediaIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idMediaMedia_id(metadata: types.GetV2SitesSiteIdMediaMediaIdMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdMediaMediaIdResponse200>>;
    /**
     * Update a media
     *
     * @summary Update a media
     * @throws FetchError<400, types.PatchV2SitesSiteIdMediaMediaIdResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PatchV2SitesSiteIdMediaMediaIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    patchV2SitesSite_idMediaMedia_id(body: types.PatchV2SitesSiteIdMediaMediaIdBodyParam, metadata: types.PatchV2SitesSiteIdMediaMediaIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdMediaMediaIdResponse200>>;
    patchV2SitesSite_idMediaMedia_id(metadata: types.PatchV2SitesSiteIdMediaMediaIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdMediaMediaIdResponse200>>;
    /**
     * Deletes the media for the given ID
     *
     * @summary Delete a media
     * @throws FetchError<404, types.DeleteV2SitesSiteIdMediaMediaIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    deleteV2SitesSite_idMediaMedia_id(metadata: types.DeleteV2SitesSiteIdMediaMediaIdMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * Initiates a reupload of a media allowing the file or URL to be replaced.  Reuploads
     * might affect audio and text tracks associated with a media. [Learn more
     * here](https://docs.jwplayer.com/platform/docs/vdh-replace-or-update-an-existing-upload)
     *
     * @summary Reupload a media
     * @throws FetchError<400, types.PutV2SitesSiteIdMediaMediaIdReuploadResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PutV2SitesSiteIdMediaMediaIdReuploadResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    putV2SitesSite_idMediaMedia_idReupload(body: types.PutV2SitesSiteIdMediaMediaIdReuploadBodyParam, metadata: types.PutV2SitesSiteIdMediaMediaIdReuploadMetadataParam): Promise<FetchResponse<200, types.PutV2SitesSiteIdMediaMediaIdReuploadResponse200>>;
    putV2SitesSite_idMediaMedia_idReupload(metadata: types.PutV2SitesSiteIdMediaMediaIdReuploadMetadataParam): Promise<FetchResponse<200, types.PutV2SitesSiteIdMediaMediaIdReuploadResponse200>>;
    /**
     * List media protection rules
     *
     * @summary List media protection rules
     * @throws FetchError<400, types.GetV2SitesSiteIdMediaProtectionRulesResponse400> Invalid JSON request body
     */
    getV2SitesSite_idMedia_protection_rules(metadata: types.GetV2SitesSiteIdMediaProtectionRulesMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdMediaProtectionRulesResponse200>>;
    /**
     * Create a media protection rule
     *
     * @summary Create a media protection rule
     * @throws FetchError<400, types.PostV2SitesSiteIdMediaProtectionRulesResponse400> Invalid JSON request body
     */
    postV2SitesSite_idMedia_protection_rules(body: types.PostV2SitesSiteIdMediaProtectionRulesBodyParam, metadata: types.PostV2SitesSiteIdMediaProtectionRulesMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdMediaProtectionRulesResponse201>>;
    postV2SitesSite_idMedia_protection_rules(metadata: types.PostV2SitesSiteIdMediaProtectionRulesMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdMediaProtectionRulesResponse201>>;
    /**
     * Get a media protection rule
     *
     * @summary Get a media protection rule
     * @throws FetchError<404, types.GetV2SitesSiteIdMediaProtectionRulesProtectionRuleIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idMedia_protection_rulesProtection_rule_id(metadata: types.GetV2SitesSiteIdMediaProtectionRulesProtectionRuleIdMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdMediaProtectionRulesProtectionRuleIdResponse200>>;
    /**
     * Update a media protection rule
     *
     * @summary Update a media protection rule
     * @throws FetchError<400, types.PatchV2SitesSiteIdMediaProtectionRulesProtectionRuleIdResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PatchV2SitesSiteIdMediaProtectionRulesProtectionRuleIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    patchV2SitesSite_idMedia_protection_rulesProtection_rule_id(body: types.PatchV2SitesSiteIdMediaProtectionRulesProtectionRuleIdBodyParam, metadata: types.PatchV2SitesSiteIdMediaProtectionRulesProtectionRuleIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdMediaProtectionRulesProtectionRuleIdResponse200>>;
    patchV2SitesSite_idMedia_protection_rulesProtection_rule_id(metadata: types.PatchV2SitesSiteIdMediaProtectionRulesProtectionRuleIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdMediaProtectionRulesProtectionRuleIdResponse200>>;
    /**
     * Delete a media protection rule
     *
     * @summary Delete a media protection rule
     * @throws FetchError<404, types.DeleteV2SitesSiteIdMediaProtectionRulesProtectionRuleIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    deleteV2SitesSite_idMedia_protection_rulesProtection_rule_id(metadata: types.DeleteV2SitesSiteIdMediaProtectionRulesProtectionRuleIdMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * List media renditions
     *
     * @throws FetchError<400, types.GetV2SitesSiteIdMediaMediaIdMediaRenditionsResponse400> Invalid JSON request body
     * @throws FetchError<404, types.GetV2SitesSiteIdMediaMediaIdMediaRenditionsResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idMediaMedia_idMedia_renditions(metadata: types.GetV2SitesSiteIdMediaMediaIdMediaRenditionsMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdMediaMediaIdMediaRenditionsResponse200>>;
    /**
     * Create a media rendition
     *
     * @throws FetchError<400, types.PostV2SitesSiteIdMediaMediaIdMediaRenditionsResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PostV2SitesSiteIdMediaMediaIdMediaRenditionsResponse404> Resource with ID supplied does not exist in account and object namespace
     * @throws FetchError<409, types.PostV2SitesSiteIdMediaMediaIdMediaRenditionsResponse409> Request conflicts with state of target resource
     */
    postV2SitesSite_idMediaMedia_idMedia_renditions(body: types.PostV2SitesSiteIdMediaMediaIdMediaRenditionsBodyParam, metadata: types.PostV2SitesSiteIdMediaMediaIdMediaRenditionsMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdMediaMediaIdMediaRenditionsResponse201>>;
    postV2SitesSite_idMediaMedia_idMedia_renditions(metadata: types.PostV2SitesSiteIdMediaMediaIdMediaRenditionsMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdMediaMediaIdMediaRenditionsResponse201>>;
    /**
     * Get a media rendition
     *
     * @throws FetchError<400, types.GetV2SitesSiteIdMediaMediaIdMediaRenditionsRenditionIdResponse400> Invalid JSON request body
     * @throws FetchError<404, types.GetV2SitesSiteIdMediaMediaIdMediaRenditionsRenditionIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idMediaMedia_idMedia_renditionsRendition_id(metadata: types.GetV2SitesSiteIdMediaMediaIdMediaRenditionsRenditionIdMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdMediaMediaIdMediaRenditionsRenditionIdResponse200>>;
    /**
     * Delete a media rendition
     *
     * @throws FetchError<404, types.DeleteV2SitesSiteIdMediaMediaIdMediaRenditionsRenditionIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    deleteV2SitesSite_idMediaMedia_idMedia_renditionsRendition_id(metadata: types.DeleteV2SitesSiteIdMediaMediaIdMediaRenditionsRenditionIdMetadataParam): Promise<FetchResponse<number, unknown>>;
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
    getV2SitesSite_idMediaMedia_idOriginals(metadata: types.GetV2SitesSiteIdMediaMediaIdOriginalsMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdMediaMediaIdOriginalsResponse200>>;
    /**
     * Creates an original resource for an additional file for the media, such as [alternate
     * audio
     * tracks](https://docs.jwplayer.com/jwplayer/docs/stream-manage-alternate-audio-tracks)
     *
     * @summary Create an original
     * @throws FetchError<400, types.PostV2SitesSiteIdMediaMediaIdOriginalsResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PostV2SitesSiteIdMediaMediaIdOriginalsResponse404> Resource with ID supplied does not exist in account and object namespace
     * @throws FetchError<412, types.PostV2SitesSiteIdMediaMediaIdOriginalsResponse412> Pre-condition Failed
     */
    postV2SitesSite_idMediaMedia_idOriginals(body: types.PostV2SitesSiteIdMediaMediaIdOriginalsBodyParam, metadata: types.PostV2SitesSiteIdMediaMediaIdOriginalsMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdMediaMediaIdOriginalsResponse201>>;
    postV2SitesSite_idMediaMedia_idOriginals(metadata: types.PostV2SitesSiteIdMediaMediaIdOriginalsMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdMediaMediaIdOriginalsResponse201>>;
    /**
     * Retrieves an original resource, which represents the primary or secondary files of a
     * hosted media, by ID
     *
     * @summary Get an original
     * @throws FetchError<404, types.GetV2SitesSiteIdMediaMediaIdOriginalsOriginalIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idMediaMedia_idOriginalsOriginal_id(metadata: types.GetV2SitesSiteIdMediaMediaIdOriginalsOriginalIdMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdMediaMediaIdOriginalsOriginalIdResponse200>>;
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
    deleteV2SitesSite_idMediaMedia_idOriginalsOriginal_id(metadata: types.DeleteV2SitesSiteIdMediaMediaIdOriginalsOriginalIdMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * List strategy rules placements for a site
     *
     * @summary List strategy rules placements
     */
    getV2SitesSite_idPlacements(metadata: types.GetV2SitesSiteIdPlacementsMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdPlacementsResponse200>>;
    /**
     * Create a strategy rules placement
     *
     * @summary Create a strategy rules placement
     * @throws FetchError<400, types.PostV2SitesSiteIdPlacementsResponse400> Invalid JSON request body
     */
    postV2SitesSite_idPlacements(body: types.PostV2SitesSiteIdPlacementsBodyParam, metadata: types.PostV2SitesSiteIdPlacementsMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdPlacementsResponse201>>;
    postV2SitesSite_idPlacements(metadata: types.PostV2SitesSiteIdPlacementsMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdPlacementsResponse201>>;
    /**
     * Retrieve the details of a specific strategy rules placement
     *
     * @summary Get a strategy rules placement
     * @throws FetchError<404, types.GetV2SitesSiteIdPlacementsPlacementIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idPlacementsPlacement_id(metadata: types.GetV2SitesSiteIdPlacementsPlacementIdMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdPlacementsPlacementIdResponse200>>;
    /**
     * Update a specific strategy rules placement
     *
     * @summary Update a strategy rules placement
     * @throws FetchError<400, types.PatchV2SitesSiteIdPlacementsPlacementIdResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PatchV2SitesSiteIdPlacementsPlacementIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    patchV2SitesSite_idPlacementsPlacement_id(body: types.PatchV2SitesSiteIdPlacementsPlacementIdBodyParam, metadata: types.PatchV2SitesSiteIdPlacementsPlacementIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdPlacementsPlacementIdResponse200>>;
    patchV2SitesSite_idPlacementsPlacement_id(metadata: types.PatchV2SitesSiteIdPlacementsPlacementIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdPlacementsPlacementIdResponse200>>;
    /**
     * Delete a specific strategy rules placement
     *
     * @summary Delete a strategy rules placement
     * @throws FetchError<404, types.DeleteV2SitesSiteIdPlacementsPlacementIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    deleteV2SitesSite_idPlacementsPlacement_id(metadata: types.DeleteV2SitesSiteIdPlacementsPlacementIdMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * List players
     *
     * @summary List players
     * @throws FetchError<400, types.GetV2SitesSiteIdPlayersResponse400> Invalid JSON request body
     */
    getV2SitesSite_idPlayers(metadata: types.GetV2SitesSiteIdPlayersMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdPlayersResponse200>>;
    /**
     * Create a player
     *
     * @summary Create a player
     * @throws FetchError<400, types.PostV2SitesSiteIdPlayersResponse400> Invalid JSON request body
     */
    postV2SitesSite_idPlayers(body: types.PostV2SitesSiteIdPlayersBodyParam, metadata: types.PostV2SitesSiteIdPlayersMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdPlayersResponse201>>;
    postV2SitesSite_idPlayers(metadata: types.PostV2SitesSiteIdPlayersMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdPlayersResponse201>>;
    /**
     * Get a player
     *
     * @summary Get a player
     * @throws FetchError<404, types.GetV2SitesSiteIdPlayersPlayerIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idPlayersPlayer_id(metadata: types.GetV2SitesSiteIdPlayersPlayerIdMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdPlayersPlayerIdResponse200>>;
    /**
     * Update a player
     *
     * @summary Update a player
     * @throws FetchError<400, types.PatchV2SitesSiteIdPlayersPlayerIdResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PatchV2SitesSiteIdPlayersPlayerIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    patchV2SitesSite_idPlayersPlayer_id(body: types.PatchV2SitesSiteIdPlayersPlayerIdBodyParam, metadata: types.PatchV2SitesSiteIdPlayersPlayerIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdPlayersPlayerIdResponse200>>;
    patchV2SitesSite_idPlayersPlayer_id(metadata: types.PatchV2SitesSiteIdPlayersPlayerIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdPlayersPlayerIdResponse200>>;
    /**
     * Delete a player
     *
     * @summary Delete a player
     * @throws FetchError<404, types.DeleteV2SitesSiteIdPlayersPlayerIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    deleteV2SitesSite_idPlayersPlayer_id(metadata: types.DeleteV2SitesSiteIdPlayersPlayerIdMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * Upload a player logo
     *
     * @summary Upload a player logo
     * @throws FetchError<400, types.PostV2SitesSiteIdPlayersLogoResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PostV2SitesSiteIdPlayersLogoResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    postV2SitesSite_idPlayersLogo(body: types.PostV2SitesSiteIdPlayersLogoBodyParam, metadata: types.PostV2SitesSiteIdPlayersLogoMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdPlayersLogoResponse201>>;
    postV2SitesSite_idPlayersLogo(metadata: types.PostV2SitesSiteIdPlayersLogoMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdPlayersLogoResponse201>>;
    /**
     * Get player logo
     *
     * @throws FetchError<400, types.GetV2SitesSiteIdPlayersLogoLogoIdResponse400> Invalid JSON request body
     * @throws FetchError<404, types.GetV2SitesSiteIdPlayersLogoLogoIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idPlayersLogoLogo_id(metadata: types.GetV2SitesSiteIdPlayersLogoLogoIdMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdPlayersLogoLogoIdResponse200>>;
    /**
     * List playlists
     *
     * @throws FetchError<400, types.GetV2SitesSiteIdPlaylistsResponse400> Invalid JSON request body
     * @throws FetchError<404, types.GetV2SitesSiteIdPlaylistsResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idPlaylists(metadata: types.GetV2SitesSiteIdPlaylistsMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdPlaylistsResponse200>>;
    /**
     * Get a playlist
     *
     * @throws FetchError<404, types.GetV2SitesSiteIdPlaylistsPlaylistIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idPlaylistsPlaylist_id(metadata: types.GetV2SitesSiteIdPlaylistsPlaylistIdMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdPlaylistsPlaylistIdResponse200>>;
    /**
     * Delete a playlist
     *
     * @throws FetchError<404, types.DeleteV2SitesSiteIdPlaylistsPlaylistIdResponse404> Resource with ID supplied does not exist in account and object namespace
     * @throws FetchError<405, types.DeleteV2SitesSiteIdPlaylistsPlaylistIdResponse405> Method is not allowed on the requested resource
     */
    deleteV2SitesSite_idPlaylistsPlaylist_id(metadata: types.DeleteV2SitesSiteIdPlaylistsPlaylistIdMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * Create a manual playlist
     *
     * @throws FetchError<400, types.PostV2SitesSiteIdPlaylistsManualPlaylistResponse400> Invalid JSON request body
     */
    postV2SitesSite_idPlaylistsManual_playlist(body: types.PostV2SitesSiteIdPlaylistsManualPlaylistBodyParam, metadata: types.PostV2SitesSiteIdPlaylistsManualPlaylistMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdPlaylistsManualPlaylistResponse201>>;
    postV2SitesSite_idPlaylistsManual_playlist(metadata: types.PostV2SitesSiteIdPlaylistsManualPlaylistMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdPlaylistsManualPlaylistResponse201>>;
    /**
     * Get a manual playlist
     *
     * @throws FetchError<404, types.GetV2SitesSiteIdPlaylistsPlaylistIdManualPlaylistResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idPlaylistsPlaylist_idManual_playlist(metadata: types.GetV2SitesSiteIdPlaylistsPlaylistIdManualPlaylistMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdPlaylistsPlaylistIdManualPlaylistResponse200>>;
    /**
     * Update a manual playlist
     *
     * @throws FetchError<400, types.PatchV2SitesSiteIdPlaylistsPlaylistIdManualPlaylistResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PatchV2SitesSiteIdPlaylistsPlaylistIdManualPlaylistResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    patchV2SitesSite_idPlaylistsPlaylist_idManual_playlist(body: types.PatchV2SitesSiteIdPlaylistsPlaylistIdManualPlaylistBodyParam, metadata: types.PatchV2SitesSiteIdPlaylistsPlaylistIdManualPlaylistMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdPlaylistsPlaylistIdManualPlaylistResponse200>>;
    patchV2SitesSite_idPlaylistsPlaylist_idManual_playlist(metadata: types.PatchV2SitesSiteIdPlaylistsPlaylistIdManualPlaylistMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdPlaylistsPlaylistIdManualPlaylistResponse200>>;
    /**
     * Delete a manual playlist
     *
     * @throws FetchError<404, types.DeleteV2SitesSiteIdPlaylistsPlaylistIdManualPlaylistResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    deleteV2SitesSite_idPlaylistsPlaylist_idManual_playlist(metadata: types.DeleteV2SitesSiteIdPlaylistsPlaylistIdManualPlaylistMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * Create a dynamic playlist
     *
     * @throws FetchError<400, types.PostV2SitesSiteIdPlaylistsDynamicPlaylistResponse400> Invalid JSON request body
     */
    postV2SitesSite_idPlaylistsDynamic_playlist(body: types.PostV2SitesSiteIdPlaylistsDynamicPlaylistBodyParam, metadata: types.PostV2SitesSiteIdPlaylistsDynamicPlaylistMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdPlaylistsDynamicPlaylistResponse201>>;
    postV2SitesSite_idPlaylistsDynamic_playlist(metadata: types.PostV2SitesSiteIdPlaylistsDynamicPlaylistMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdPlaylistsDynamicPlaylistResponse201>>;
    /**
     * Get a dynamic playlist
     *
     * @throws FetchError<404, types.GetV2SitesSiteIdPlaylistsPlaylistIdDynamicPlaylistResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idPlaylistsPlaylist_idDynamic_playlist(metadata: types.GetV2SitesSiteIdPlaylistsPlaylistIdDynamicPlaylistMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdPlaylistsPlaylistIdDynamicPlaylistResponse200>>;
    /**
     * Update a dynamic playlist
     *
     * @throws FetchError<400, types.PatchV2SitesSiteIdPlaylistsPlaylistIdDynamicPlaylistResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PatchV2SitesSiteIdPlaylistsPlaylistIdDynamicPlaylistResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    patchV2SitesSite_idPlaylistsPlaylist_idDynamic_playlist(body: types.PatchV2SitesSiteIdPlaylistsPlaylistIdDynamicPlaylistBodyParam, metadata: types.PatchV2SitesSiteIdPlaylistsPlaylistIdDynamicPlaylistMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdPlaylistsPlaylistIdDynamicPlaylistResponse200>>;
    patchV2SitesSite_idPlaylistsPlaylist_idDynamic_playlist(metadata: types.PatchV2SitesSiteIdPlaylistsPlaylistIdDynamicPlaylistMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdPlaylistsPlaylistIdDynamicPlaylistResponse200>>;
    /**
     * Delete a dynamic playlist
     *
     * @throws FetchError<404, types.DeleteV2SitesSiteIdPlaylistsPlaylistIdDynamicPlaylistResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    deleteV2SitesSite_idPlaylistsPlaylist_idDynamic_playlist(metadata: types.DeleteV2SitesSiteIdPlaylistsPlaylistIdDynamicPlaylistMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * Create an article matching playlist
     *
     * @throws FetchError<400, types.PostV2SitesSiteIdPlaylistsArticleMatchingPlaylistResponse400> Invalid JSON request body
     */
    postV2SitesSite_idPlaylistsArticle_matching_playlist(body: types.PostV2SitesSiteIdPlaylistsArticleMatchingPlaylistBodyParam, metadata: types.PostV2SitesSiteIdPlaylistsArticleMatchingPlaylistMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdPlaylistsArticleMatchingPlaylistResponse201>>;
    postV2SitesSite_idPlaylistsArticle_matching_playlist(metadata: types.PostV2SitesSiteIdPlaylistsArticleMatchingPlaylistMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdPlaylistsArticleMatchingPlaylistResponse201>>;
    /**
     * Get an article matching playlist
     *
     * @throws FetchError<404, types.GetV2SitesSiteIdPlaylistsPlaylistIdArticleMatchingPlaylistResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idPlaylistsPlaylist_idArticle_matching_playlist(metadata: types.GetV2SitesSiteIdPlaylistsPlaylistIdArticleMatchingPlaylistMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdPlaylistsPlaylistIdArticleMatchingPlaylistResponse200>>;
    /**
     * Update an article matching playlist
     *
     * @throws FetchError<400, types.PatchV2SitesSiteIdPlaylistsPlaylistIdArticleMatchingPlaylistResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PatchV2SitesSiteIdPlaylistsPlaylistIdArticleMatchingPlaylistResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    patchV2SitesSite_idPlaylistsPlaylist_idArticle_matching_playlist(body: types.PatchV2SitesSiteIdPlaylistsPlaylistIdArticleMatchingPlaylistBodyParam, metadata: types.PatchV2SitesSiteIdPlaylistsPlaylistIdArticleMatchingPlaylistMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdPlaylistsPlaylistIdArticleMatchingPlaylistResponse200>>;
    patchV2SitesSite_idPlaylistsPlaylist_idArticle_matching_playlist(metadata: types.PatchV2SitesSiteIdPlaylistsPlaylistIdArticleMatchingPlaylistMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdPlaylistsPlaylistIdArticleMatchingPlaylistResponse200>>;
    /**
     * Delete an article matching playlist
     *
     * @throws FetchError<404, types.DeleteV2SitesSiteIdPlaylistsPlaylistIdArticleMatchingPlaylistResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    deleteV2SitesSite_idPlaylistsPlaylist_idArticle_matching_playlist(metadata: types.DeleteV2SitesSiteIdPlaylistsPlaylistIdArticleMatchingPlaylistMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * Create a search playlist
     *
     * @throws FetchError<400, types.PostV2SitesSiteIdPlaylistsSearchPlaylistResponse400> Invalid JSON request body
     */
    postV2SitesSite_idPlaylistsSearch_playlist(body: types.PostV2SitesSiteIdPlaylistsSearchPlaylistBodyParam, metadata: types.PostV2SitesSiteIdPlaylistsSearchPlaylistMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdPlaylistsSearchPlaylistResponse201>>;
    postV2SitesSite_idPlaylistsSearch_playlist(metadata: types.PostV2SitesSiteIdPlaylistsSearchPlaylistMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdPlaylistsSearchPlaylistResponse201>>;
    /**
     * Get a search playlist
     *
     * @throws FetchError<404, types.GetV2SitesSiteIdPlaylistsPlaylistIdSearchPlaylistResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idPlaylistsPlaylist_idSearch_playlist(metadata: types.GetV2SitesSiteIdPlaylistsPlaylistIdSearchPlaylistMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdPlaylistsPlaylistIdSearchPlaylistResponse200>>;
    /**
     * Update a search playlist
     *
     * @throws FetchError<400, types.PatchV2SitesSiteIdPlaylistsPlaylistIdSearchPlaylistResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PatchV2SitesSiteIdPlaylistsPlaylistIdSearchPlaylistResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    patchV2SitesSite_idPlaylistsPlaylist_idSearch_playlist(body: types.PatchV2SitesSiteIdPlaylistsPlaylistIdSearchPlaylistBodyParam, metadata: types.PatchV2SitesSiteIdPlaylistsPlaylistIdSearchPlaylistMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdPlaylistsPlaylistIdSearchPlaylistResponse200>>;
    patchV2SitesSite_idPlaylistsPlaylist_idSearch_playlist(metadata: types.PatchV2SitesSiteIdPlaylistsPlaylistIdSearchPlaylistMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdPlaylistsPlaylistIdSearchPlaylistResponse200>>;
    /**
     * Delete a search playlist
     *
     * @throws FetchError<404, types.DeleteV2SitesSiteIdPlaylistsPlaylistIdSearchPlaylistResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    deleteV2SitesSite_idPlaylistsPlaylist_idSearch_playlist(metadata: types.DeleteV2SitesSiteIdPlaylistsPlaylistIdSearchPlaylistMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * Create a recommendations playlist
     *
     * @throws FetchError<400, types.PostV2SitesSiteIdPlaylistsRecommendationsPlaylistResponse400> Invalid JSON request body
     */
    postV2SitesSite_idPlaylistsRecommendations_playlist(body: types.PostV2SitesSiteIdPlaylistsRecommendationsPlaylistBodyParam, metadata: types.PostV2SitesSiteIdPlaylistsRecommendationsPlaylistMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdPlaylistsRecommendationsPlaylistResponse201>>;
    postV2SitesSite_idPlaylistsRecommendations_playlist(metadata: types.PostV2SitesSiteIdPlaylistsRecommendationsPlaylistMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdPlaylistsRecommendationsPlaylistResponse201>>;
    /**
     * Get a recommendations playlist
     *
     * @throws FetchError<404, types.GetV2SitesSiteIdPlaylistsPlaylistIdRecommendationsPlaylistResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idPlaylistsPlaylist_idRecommendations_playlist(metadata: types.GetV2SitesSiteIdPlaylistsPlaylistIdRecommendationsPlaylistMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdPlaylistsPlaylistIdRecommendationsPlaylistResponse200>>;
    /**
     * Update a recommendations playlist
     *
     * @throws FetchError<400, types.PatchV2SitesSiteIdPlaylistsPlaylistIdRecommendationsPlaylistResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PatchV2SitesSiteIdPlaylistsPlaylistIdRecommendationsPlaylistResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    patchV2SitesSite_idPlaylistsPlaylist_idRecommendations_playlist(body: types.PatchV2SitesSiteIdPlaylistsPlaylistIdRecommendationsPlaylistBodyParam, metadata: types.PatchV2SitesSiteIdPlaylistsPlaylistIdRecommendationsPlaylistMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdPlaylistsPlaylistIdRecommendationsPlaylistResponse200>>;
    patchV2SitesSite_idPlaylistsPlaylist_idRecommendations_playlist(metadata: types.PatchV2SitesSiteIdPlaylistsPlaylistIdRecommendationsPlaylistMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdPlaylistsPlaylistIdRecommendationsPlaylistResponse200>>;
    /**
     * Delete a recommendations playlist
     *
     * @throws FetchError<404, types.DeleteV2SitesSiteIdPlaylistsPlaylistIdRecommendationsPlaylistResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    deleteV2SitesSite_idPlaylistsPlaylist_idRecommendations_playlist(metadata: types.DeleteV2SitesSiteIdPlaylistsPlaylistIdRecommendationsPlaylistMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * Create a watchlist playlist
     *
     * @throws FetchError<400, types.PostV2SitesSiteIdPlaylistsWatchlistPlaylistResponse400> Invalid JSON request body
     */
    postV2SitesSite_idPlaylistsWatchlist_playlist(body: types.PostV2SitesSiteIdPlaylistsWatchlistPlaylistBodyParam, metadata: types.PostV2SitesSiteIdPlaylistsWatchlistPlaylistMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdPlaylistsWatchlistPlaylistResponse201>>;
    postV2SitesSite_idPlaylistsWatchlist_playlist(metadata: types.PostV2SitesSiteIdPlaylistsWatchlistPlaylistMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdPlaylistsWatchlistPlaylistResponse201>>;
    /**
     * Get a watchlist playlist
     *
     * @throws FetchError<404, types.GetV2SitesSiteIdPlaylistsPlaylistIdWatchlistPlaylistResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idPlaylistsPlaylist_idWatchlist_playlist(metadata: types.GetV2SitesSiteIdPlaylistsPlaylistIdWatchlistPlaylistMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdPlaylistsPlaylistIdWatchlistPlaylistResponse200>>;
    /**
     * Update a watchlist playlist
     *
     * @throws FetchError<400, types.PatchV2SitesSiteIdPlaylistsPlaylistIdWatchlistPlaylistResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PatchV2SitesSiteIdPlaylistsPlaylistIdWatchlistPlaylistResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    patchV2SitesSite_idPlaylistsPlaylist_idWatchlist_playlist(body: types.PatchV2SitesSiteIdPlaylistsPlaylistIdWatchlistPlaylistBodyParam, metadata: types.PatchV2SitesSiteIdPlaylistsPlaylistIdWatchlistPlaylistMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdPlaylistsPlaylistIdWatchlistPlaylistResponse200>>;
    patchV2SitesSite_idPlaylistsPlaylist_idWatchlist_playlist(metadata: types.PatchV2SitesSiteIdPlaylistsPlaylistIdWatchlistPlaylistMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdPlaylistsPlaylistIdWatchlistPlaylistResponse200>>;
    /**
     * Delete a watchlist playlist
     *
     * @throws FetchError<404, types.DeleteV2SitesSiteIdPlaylistsPlaylistIdWatchlistPlaylistResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    deleteV2SitesSite_idPlaylistsPlaylist_idWatchlist_playlist(metadata: types.DeleteV2SitesSiteIdPlaylistsPlaylistIdWatchlistPlaylistMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * List series
     *
     * @throws FetchError<400, types.GetV2SitesSiteIdSeriesResponse400> Invalid JSON request body
     */
    getV2SitesSite_idSeries(metadata: types.GetV2SitesSiteIdSeriesMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdSeriesResponse200>>;
    /**
     * Create a series
     *
     * @throws FetchError<400, types.PostV2SitesSiteIdSeriesResponse400> Invalid JSON request body
     */
    postV2SitesSite_idSeries(body: types.PostV2SitesSiteIdSeriesBodyParam, metadata: types.PostV2SitesSiteIdSeriesMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdSeriesResponse201>>;
    /**
     * Get a series
     *
     * @throws FetchError<404, types.GetV2SitesSiteIdSeriesSeriesIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idSeriesSeries_id(metadata: types.GetV2SitesSiteIdSeriesSeriesIdMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdSeriesSeriesIdResponse200>>;
    /**
     * Update a series
     *
     * @throws FetchError<400, types.PatchV2SitesSiteIdSeriesSeriesIdResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PatchV2SitesSiteIdSeriesSeriesIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    patchV2SitesSite_idSeriesSeries_id(body: types.PatchV2SitesSiteIdSeriesSeriesIdBodyParam, metadata: types.PatchV2SitesSiteIdSeriesSeriesIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdSeriesSeriesIdResponse200>>;
    patchV2SitesSite_idSeriesSeries_id(metadata: types.PatchV2SitesSiteIdSeriesSeriesIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdSeriesSeriesIdResponse200>>;
    /**
     * Delete a series
     *
     * @throws FetchError<404, types.DeleteV2SitesSiteIdSeriesSeriesIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    deleteV2SitesSite_idSeriesSeries_id(metadata: types.DeleteV2SitesSiteIdSeriesSeriesIdMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * List seasons
     *
     * @throws FetchError<400, types.GetV2SitesSiteIdSeriesSeriesIdSeasonsResponse400> Invalid JSON request body
     */
    getV2SitesSite_idSeriesSeries_idSeasons(metadata: types.GetV2SitesSiteIdSeriesSeriesIdSeasonsMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdSeriesSeriesIdSeasonsResponse200>>;
    /**
     * Create a season
     *
     * @throws FetchError<400, types.PostV2SitesSiteIdSeriesSeriesIdSeasonsResponse400> Invalid JSON request body
     */
    postV2SitesSite_idSeriesSeries_idSeasons(body: types.PostV2SitesSiteIdSeriesSeriesIdSeasonsBodyParam, metadata: types.PostV2SitesSiteIdSeriesSeriesIdSeasonsMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdSeriesSeriesIdSeasonsResponse201>>;
    /**
     * Get a season
     *
     * @throws FetchError<404, types.GetV2SitesSiteIdSeriesSeriesIdSeasonsSeasonIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idSeriesSeries_idSeasonsSeason_id(metadata: types.GetV2SitesSiteIdSeriesSeriesIdSeasonsSeasonIdMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdSeriesSeriesIdSeasonsSeasonIdResponse200>>;
    /**
     * Update a season
     *
     * @throws FetchError<400, types.PatchV2SitesSiteIdSeriesSeriesIdSeasonsSeasonIdResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PatchV2SitesSiteIdSeriesSeriesIdSeasonsSeasonIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    patchV2SitesSite_idSeriesSeries_idSeasonsSeason_id(body: types.PatchV2SitesSiteIdSeriesSeriesIdSeasonsSeasonIdBodyParam, metadata: types.PatchV2SitesSiteIdSeriesSeriesIdSeasonsSeasonIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdSeriesSeriesIdSeasonsSeasonIdResponse200>>;
    patchV2SitesSite_idSeriesSeries_idSeasonsSeason_id(metadata: types.PatchV2SitesSiteIdSeriesSeriesIdSeasonsSeasonIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdSeriesSeriesIdSeasonsSeasonIdResponse200>>;
    /**
     * Delete a season
     *
     * @throws FetchError<404, types.DeleteV2SitesSiteIdSeriesSeriesIdSeasonsSeasonIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    deleteV2SitesSite_idSeriesSeries_idSeasonsSeason_id(metadata: types.DeleteV2SitesSiteIdSeriesSeriesIdSeasonsSeasonIdMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * Get the site protection rule
     *
     * @summary Get the site protection rule
     */
    getV2SitesSite_idSite_protection_rule(metadata: types.GetV2SitesSiteIdSiteProtectionRuleMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdSiteProtectionRuleResponse200>>;
    /**
     * Update the site protection rule
     *
     * @summary Update the site protection rule
     * @throws FetchError<400, types.PatchV2SitesSiteIdSiteProtectionRuleResponse400> Invalid JSON request body
     */
    patchV2SitesSite_idSite_protection_rule(body: types.PatchV2SitesSiteIdSiteProtectionRuleBodyParam, metadata: types.PatchV2SitesSiteIdSiteProtectionRuleMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdSiteProtectionRuleResponse200>>;
    patchV2SitesSite_idSite_protection_rule(metadata: types.PatchV2SitesSiteIdSiteProtectionRuleMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdSiteProtectionRuleResponse200>>;
    /**
     * List all ad configs for a site
     *
     * @summary List ad configs
     */
    getV2SitesSite_idAd_configs(metadata: types.GetV2SitesSiteIdAdConfigsMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdAdConfigsResponse200>>;
    /**
     * Create an ad config for a site
     *
     * @summary Create an ad config
     */
    postV2SitesSite_idAd_configs(body: types.PostV2SitesSiteIdAdConfigsBodyParam, metadata: types.PostV2SitesSiteIdAdConfigsMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdAdConfigsResponse201>>;
    /**
     * Retrieve the details of a specific ad config
     *
     * @summary Get an ad config
     */
    getV2SitesSite_idAd_configsAd_config_id(metadata: types.GetV2SitesSiteIdAdConfigsAdConfigIdMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdAdConfigsAdConfigIdResponse200>>;
    /**
     * Update a specific ad config
     *
     * @summary Update an ad config
     */
    patchV2SitesSite_idAd_configsAd_config_id(body: types.PatchV2SitesSiteIdAdConfigsAdConfigIdBodyParam, metadata: types.PatchV2SitesSiteIdAdConfigsAdConfigIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdAdConfigsAdConfigIdResponse200>>;
    /**
     * Delete a specific ad config
     *
     * @summary Delete an ad config
     */
    deleteV2SitesSite_idAd_configsAd_config_id(metadata: types.DeleteV2SitesSiteIdAdConfigsAdConfigIdMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * List all timings sets for a media
     *
     * @summary List media timings sets
     */
    getV2SitesSite_idMediaMedia_idTimings(metadata: types.GetV2SitesSiteIdMediaMediaIdTimingsMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdMediaMediaIdTimingsResponse200>>;
    /**
     * Create a set of ad timings for a media
     *
     * @summary Create a media timings set
     */
    postV2SitesSite_idMediaMedia_idTimings(body: types.PostV2SitesSiteIdMediaMediaIdTimingsBodyParam, metadata: types.PostV2SitesSiteIdMediaMediaIdTimingsMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdMediaMediaIdTimingsResponse201>>;
    /**
     * Get a specific set of ad timings for a media
     *
     * @summary Get a media timings set
     */
    getV2SitesSite_idMediaMedia_idTimingsTiming_id(metadata: types.GetV2SitesSiteIdMediaMediaIdTimingsTimingIdMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdMediaMediaIdTimingsTimingIdResponse200>>;
    /**
     * Update a specific set of ad timings for a media
     *
     * @summary Update a media timings set
     */
    patchV2SitesSite_idMediaMedia_idTimingsTiming_id(body: types.PatchV2SitesSiteIdMediaMediaIdTimingsTimingIdBodyParam, metadata: types.PatchV2SitesSiteIdMediaMediaIdTimingsTimingIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdMediaMediaIdTimingsTimingIdResponse200>>;
    /**
     * Delete a specific set of ad timings for a media
     *
     * @summary Delete a media timings set
     */
    deleteV2SitesSite_idMediaMedia_idTimingsTiming_id(metadata: types.DeleteV2SitesSiteIdMediaMediaIdTimingsTimingIdMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * List all SSAI strategy configs for a site
     *
     * @summary List SSAI strategy configs
     */
    getV2SitesSite_idSsai_strategies(metadata: types.GetV2SitesSiteIdSsaiStrategiesMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdSsaiStrategiesResponse200>>;
    /**
     * Create an SSAI strategy config for a site
     *
     * @summary Create an SSAI strategy config
     */
    postV2SitesSite_idSsai_strategies(body: types.PostV2SitesSiteIdSsaiStrategiesBodyParam, metadata: types.PostV2SitesSiteIdSsaiStrategiesMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdSsaiStrategiesResponse201>>;
    /**
     * Get a specific SSAI strategy config
     *
     * @summary Get an SSAI strategy config
     */
    getV2SitesSite_idSsai_strategiesAd_config_id(metadata: types.GetV2SitesSiteIdSsaiStrategiesAdConfigIdMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdSsaiStrategiesAdConfigIdResponse200>>;
    /**
     * Update a specific SSAI strategy config
     *
     * @summary Update an SSAI strategy config
     */
    patchV2SitesSite_idSsai_strategiesAd_config_id(body: types.PatchV2SitesSiteIdSsaiStrategiesAdConfigIdBodyParam, metadata: types.PatchV2SitesSiteIdSsaiStrategiesAdConfigIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdSsaiStrategiesAdConfigIdResponse200>>;
    /**
     * Delete a specific SSAI strategy config
     *
     * @summary Delete an SSAI strategy config
     */
    deleteV2SitesSite_idSsai_strategiesAd_config_id(metadata: types.DeleteV2SitesSiteIdSsaiStrategiesAdConfigIdMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * Create an ad break for a live media
     *
     * @summary Create live ad break
     * @throws FetchError<404, types.PostV2SitesSiteIdLiveMediaIdAdBreaksResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    postV2SitesSite_idLiveMedia_idAd_breaks(body: types.PostV2SitesSiteIdLiveMediaIdAdBreaksBodyParam, metadata: types.PostV2SitesSiteIdLiveMediaIdAdBreaksMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdLiveMediaIdAdBreaksResponse201>>;
    /**
     * List all live ad breaks for a media
     *
     * @summary List live ad breaks
     * @throws FetchError<404, types.GetV2SitesSiteIdLiveMediaIdAdBreaksResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idLiveMedia_idAd_breaks(metadata: types.GetV2SitesSiteIdLiveMediaIdAdBreaksMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdLiveMediaIdAdBreaksResponse200>>;
    /**
     * List tags on the account
     *
     * @summary List tags
     * @throws FetchError<400, types.GetV2SitesSiteIdTagsResponse400> Invalid JSON request body
     */
    getV2SitesSite_idTags(metadata: types.GetV2SitesSiteIdTagsMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdTagsResponse200>>;
    /**
     * Create a tag associated with a given site
     *
     * @throws FetchError<400, types.PostV2SitesSiteIdTagsResponse400> Invalid JSON request body
     */
    postV2SitesSite_idTags(body: types.PostV2SitesSiteIdTagsBodyParam, metadata: types.PostV2SitesSiteIdTagsMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdTagsResponse201>>;
    postV2SitesSite_idTags(metadata: types.PostV2SitesSiteIdTagsMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdTagsResponse201>>;
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
    putV2SitesSite_idRemove_tag(body: types.PutV2SitesSiteIdRemoveTagBodyParam, metadata: types.PutV2SitesSiteIdRemoveTagMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * Renames a tag across all associated media and playlist resources
     * The time to complete the tag renaming depends upon the number of associated media and
     * playlists.
     *
     * @summary Bulk rename tags
     * @throws FetchError<400, types.PutV2SitesSiteIdRenameTagResponse400> Invalid JSON request body
     */
    putV2SitesSite_idRename_tag(body: types.PutV2SitesSiteIdRenameTagBodyParam, metadata: types.PutV2SitesSiteIdRenameTagMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * List text tracks
     *
     * @throws FetchError<400, types.GetV2SitesSiteIdMediaMediaIdTextTracksResponse400> Invalid JSON request body
     * @throws FetchError<404, types.GetV2SitesSiteIdMediaMediaIdTextTracksResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idMediaMedia_idText_tracks(metadata: types.GetV2SitesSiteIdMediaMediaIdTextTracksMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdMediaMediaIdTextTracksResponse200>>;
    /**
     * Generate a text track for the associated media. Each media can have a maximum of 50 text
     * tracks.
     *
     * @summary Create a text track
     * @throws FetchError<400, types.PostV2SitesSiteIdMediaMediaIdTextTracksResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PostV2SitesSiteIdMediaMediaIdTextTracksResponse404> Resource with ID supplied does not exist in account and object namespace
     * @throws FetchError<409, types.PostV2SitesSiteIdMediaMediaIdTextTracksResponse409> Request cannot be created because media reached maximum limit of 50.
     */
    postV2SitesSite_idMediaMedia_idText_tracks(body: types.PostV2SitesSiteIdMediaMediaIdTextTracksBodyParam, metadata: types.PostV2SitesSiteIdMediaMediaIdTextTracksMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdMediaMediaIdTextTracksResponse201>>;
    postV2SitesSite_idMediaMedia_idText_tracks(metadata: types.PostV2SitesSiteIdMediaMediaIdTextTracksMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdMediaMediaIdTextTracksResponse201>>;
    /**
     * Get a text track
     *
     * @throws FetchError<400, types.GetV2SitesSiteIdMediaMediaIdTextTracksTrackIdResponse400> Invalid JSON request body
     * @throws FetchError<404, types.GetV2SitesSiteIdMediaMediaIdTextTracksTrackIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idMediaMedia_idText_tracksTrack_id(metadata: types.GetV2SitesSiteIdMediaMediaIdTextTracksTrackIdMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdMediaMediaIdTextTracksTrackIdResponse200>>;
    /**
     * Update a text track
     *
     * @throws FetchError<400, types.PatchV2SitesSiteIdMediaMediaIdTextTracksTrackIdResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PatchV2SitesSiteIdMediaMediaIdTextTracksTrackIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    patchV2SitesSite_idMediaMedia_idText_tracksTrack_id(body: types.PatchV2SitesSiteIdMediaMediaIdTextTracksTrackIdBodyParam, metadata: types.PatchV2SitesSiteIdMediaMediaIdTextTracksTrackIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdMediaMediaIdTextTracksTrackIdResponse200>>;
    patchV2SitesSite_idMediaMedia_idText_tracksTrack_id(metadata: types.PatchV2SitesSiteIdMediaMediaIdTextTracksTrackIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdMediaMediaIdTextTracksTrackIdResponse200>>;
    /**
     * Delete a text track
     *
     * @throws FetchError<404, types.DeleteV2SitesSiteIdMediaMediaIdTextTracksTrackIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    deleteV2SitesSite_idMediaMedia_idText_tracksTrack_id(metadata: types.DeleteV2SitesSiteIdMediaMediaIdTextTracksTrackIdMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * Enables a text track to be delivered via the Delivery API by changing the track status
     * from `draft` to `ready`.
     *
     * @summary Publish a track
     * @throws FetchError<409, types.PutV2SitesSiteIdMediaMediaIdTextTracksTrackIdPublishResponse409> Request conflicts with state of target resource
     */
    putV2SitesSite_idMediaMedia_idText_tracksTrack_idPublish(metadata: types.PutV2SitesSiteIdMediaMediaIdTextTracksTrackIdPublishMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * Prevents a text track from delivering via the Delivery API by changing the track status
     * from `ready` to `draft`.
     *
     * @summary Unpublish a track
     * @throws FetchError<409, types.PutV2SitesSiteIdMediaMediaIdTextTracksTrackIdUnpublishResponse409> Request conflicts with state of target resource
     */
    putV2SitesSite_idMediaMedia_idText_tracksTrack_idUnpublish(metadata: types.PutV2SitesSiteIdMediaMediaIdTextTracksTrackIdUnpublishMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * Create a thumbnail
     *
     * @summary Create a thumbnail
     * @throws FetchError<400, types.PostV2SitesSiteIdThumbnailsResponse400> Invalid JSON request body
     */
    postV2SitesSite_idThumbnails(body: types.PostV2SitesSiteIdThumbnailsBodyParam, metadata: types.PostV2SitesSiteIdThumbnailsMetadataParam): Promise<FetchResponse<201, types.PostV2SitesSiteIdThumbnailsResponse201>>;
    /**
     * List thumbnails
     *
     * @summary List thumbnails
     * @throws FetchError<400, types.GetV2SitesSiteIdThumbnailsResponse400> Invalid JSON request body
     * @throws FetchError<404, types.GetV2SitesSiteIdThumbnailsResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idThumbnails(metadata: types.GetV2SitesSiteIdThumbnailsMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdThumbnailsResponse200>>;
    /**
     * Update a thumbnail
     *
     * @summary Update a thumbnail
     * @throws FetchError<400, types.PatchV2SitesSiteIdThumbnailsThumbnailIdResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PatchV2SitesSiteIdThumbnailsThumbnailIdResponse404> Resource with ID supplied does not exist in account and object namespace
     * @throws FetchError<409, types.PatchV2SitesSiteIdThumbnailsThumbnailIdResponse409> Request conflicts with state of target resource
     */
    patchV2SitesSite_idThumbnailsThumbnail_id(body: types.PatchV2SitesSiteIdThumbnailsThumbnailIdBodyParam, metadata: types.PatchV2SitesSiteIdThumbnailsThumbnailIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdThumbnailsThumbnailIdResponse200>>;
    /**
     * Get a thumbnail
     *
     * @summary Get a thumbnail
     * @throws FetchError<404, types.GetV2SitesSiteIdThumbnailsThumbnailIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idThumbnailsThumbnail_id(metadata: types.GetV2SitesSiteIdThumbnailsThumbnailIdMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdThumbnailsThumbnailIdResponse200>>;
    /**
     * Delete a thumbnail
     *
     * @summary Delete a thumbnail
     * @throws FetchError<400, types.DeleteV2SitesSiteIdThumbnailsThumbnailIdResponse400> Invalid JSON request body
     * @throws FetchError<404, types.DeleteV2SitesSiteIdThumbnailsThumbnailIdResponse404> Resource with ID supplied does not exist in account and object namespace
     * @throws FetchError<409, types.DeleteV2SitesSiteIdThumbnailsThumbnailIdResponse409> Request conflicts with state of target resource
     */
    deleteV2SitesSite_idThumbnailsThumbnail_id(metadata: types.DeleteV2SitesSiteIdThumbnailsThumbnailIdMetadataParam): Promise<FetchResponse<number, unknown>>;
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
    putV2SitesSite_idTransformation_transform(body: types.PutV2SitesSiteIdTransformationTransformBodyParam, metadata: types.PutV2SitesSiteIdTransformationTransformMetadataParam): Promise<FetchResponse<201, types.PutV2SitesSiteIdTransformationTransformResponse201>>;
    /**
     * Retrieves a paginated list of transformation runs for the specified site
     *
     * @summary List transformation runs
     */
    getV2SitesSite_idTransformation_runs(metadata: types.GetV2SitesSiteIdTransformationRunsMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdTransformationRunsResponse200>>;
    /**
     * Retrieves a specific transformation run by ID
     *
     * @summary Get a transformation run
     * @throws FetchError<404, types.GetV2SitesSiteIdTransformationRunsTransformationRunIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idTransformation_runsTransformation_run_id(metadata: types.GetV2SitesSiteIdTransformationRunsTransformationRunIdMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdTransformationRunsTransformationRunIdResponse200>>;
    /**
     * Retrieves a paginated list of assets created by transformations for the specified site
     *
     * @summary List transformation assets
     */
    getV2SitesSite_idTransformation_assets(metadata: types.GetV2SitesSiteIdTransformationAssetsMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdTransformationAssetsResponse200>>;
    /**
     * Retrieves a specific transformation asset by ID
     *
     * @summary Get a transformation asset
     * @throws FetchError<404, types.GetV2SitesSiteIdTransformationAssetsAssetIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idTransformation_assetsAsset_id(metadata: types.GetV2SitesSiteIdTransformationAssetsAssetIdMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdTransformationAssetsAssetIdResponse200>>;
    /**
     * Update an asset
     *
     * @throws FetchError<400, types.PatchV2SitesSiteIdTransformationAssetsAssetIdResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PatchV2SitesSiteIdTransformationAssetsAssetIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    patchV2SitesSite_idTransformation_assetsAsset_id(body: types.PatchV2SitesSiteIdTransformationAssetsAssetIdBodyParam, metadata: types.PatchV2SitesSiteIdTransformationAssetsAssetIdMetadataParam): Promise<FetchResponse<200, types.PatchV2SitesSiteIdTransformationAssetsAssetIdResponse200>>;
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
    putV2SitesSite_idTransformation_assetsAsset_idUnpublish(metadata: types.PutV2SitesSiteIdTransformationAssetsAssetIdUnpublishMetadataParam): Promise<FetchResponse<200, types.PutV2SitesSiteIdTransformationAssetsAssetIdUnpublishResponse200>>;
    /**
     * Retrieves a paginated list of transformation projects for the specified site
     *
     * @summary List transformation projects
     */
    getV2SitesSite_idTransformation_projects(metadata: types.GetV2SitesSiteIdTransformationProjectsMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdTransformationProjectsResponse200>>;
    /**
     * Retrieves a specific transformation project by ID
     *
     * @summary Get a transformation project
     * @throws FetchError<404, types.GetV2SitesSiteIdTransformationProjectsProjectIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idTransformation_projectsProject_id(metadata: types.GetV2SitesSiteIdTransformationProjectsProjectIdMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdTransformationProjectsProjectIdResponse200>>;
    /**
     * Retrieves a paginated list of asset version snapshots for the specified site
     *
     * @summary List transformation asset versions
     */
    getV2SitesSite_idTransformation_asset_versions(metadata: types.GetV2SitesSiteIdTransformationAssetVersionsMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdTransformationAssetVersionsResponse200>>;
    /**
     * Retrieves a specific asset version snapshot by ID
     *
     * @summary Get a transformation asset version
     * @throws FetchError<404, types.GetV2SitesSiteIdTransformationAssetVersionsAssetVersionIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idTransformation_asset_versionsAsset_version_id(metadata: types.GetV2SitesSiteIdTransformationAssetVersionsAssetVersionIdMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdTransformationAssetVersionsAssetVersionIdResponse200>>;
    /**
     * Retrieves a specific article audio variant by ID
     *
     * @summary Get an article audio variant
     * @throws FetchError<404, types.GetV2SitesSiteIdArticleAudioVariantsArticleAudioVariantIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idArticle_audio_variantsArticle_audio_variant_id(metadata: types.GetV2SitesSiteIdArticleAudioVariantsArticleAudioVariantIdMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdArticleAudioVariantsArticleAudioVariantIdResponse200>>;
    /**
     * Retrieves a paginated list of versions for a specific article audio variant
     *
     * @summary List article audio variant versions
     */
    getV2SitesSite_idArticle_audio_variantsArticle_audio_variant_idVersions(metadata: types.GetV2SitesSiteIdArticleAudioVariantsArticleAudioVariantIdVersionsMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdArticleAudioVariantsArticleAudioVariantIdVersionsResponse200>>;
    /**
     * Retrieves a specific article audio variant version by ID
     *
     * @summary Get an article audio variant version
     * @throws FetchError<404, types.GetV2SitesSiteIdArticleAudioVariantsArticleAudioVariantIdVersionsArticleAudioVariantVersionIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2SitesSite_idArticle_audio_variantsArticle_audio_variant_idVersionsArticle_audio_variant_version_id(metadata: types.GetV2SitesSiteIdArticleAudioVariantsArticleAudioVariantIdVersionsArticleAudioVariantVersionIdMetadataParam): Promise<FetchResponse<200, types.GetV2SitesSiteIdArticleAudioVariantsArticleAudioVariantIdVersionsArticleAudioVariantVersionIdResponse200>>;
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
    getV2UploadsUpload_idParts(metadata: types.GetV2UploadsUploadIdPartsMetadataParam): Promise<FetchResponse<200, types.GetV2UploadsUploadIdPartsResponse200>>;
    /**
     * All parts must be uploaded to complete the multipart upload.
     *
     * @summary Complete an upload
     * @throws FetchError<403, types.PutV2UploadsUploadIdCompleteResponse403> Action forbidden.
     * @throws FetchError<404, types.PutV2UploadsUploadIdCompleteResponse404> Resource with ID supplied does not exist in account and object namespace
     * @throws FetchError<409, types.PutV2UploadsUploadIdCompleteResponse409> Request conflicts with state of target resource
     */
    putV2UploadsUpload_idComplete(metadata: types.PutV2UploadsUploadIdCompleteMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * List webhooks on the account
     *
     * @summary List webhooks
     * @throws FetchError<400, types.GetV2WebhooksResponse400> Invalid JSON request body
     */
    getV2Webhooks(metadata?: types.GetV2WebhooksMetadataParam): Promise<FetchResponse<200, types.GetV2WebhooksResponse200>>;
    /**
     * Create a webhook
     *
     * @summary Create a webhook
     * @throws FetchError<400, types.PostV2WebhooksResponse400> Invalid JSON request body
     * @throws FetchError<409, types.PostV2WebhooksResponse409> Request conflicts with state of target resource
     */
    postV2Webhooks(body?: types.PostV2WebhooksBodyParam): Promise<FetchResponse<201, types.PostV2WebhooksResponse201>>;
    /**
     * Get a webhook
     *
     * @summary Get a webhook
     * @throws FetchError<404, types.GetV2WebhooksWebhookIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    getV2WebhooksWebhook_id(metadata: types.GetV2WebhooksWebhookIdMetadataParam): Promise<FetchResponse<200, types.GetV2WebhooksWebhookIdResponse200>>;
    /**
     * Update a webhook
     *
     * @summary Update a webhook
     * @throws FetchError<400, types.PatchV2WebhooksWebhookIdResponse400> Invalid JSON request body
     * @throws FetchError<404, types.PatchV2WebhooksWebhookIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    patchV2WebhooksWebhook_id(body: types.PatchV2WebhooksWebhookIdBodyParam, metadata: types.PatchV2WebhooksWebhookIdMetadataParam): Promise<FetchResponse<200, types.PatchV2WebhooksWebhookIdResponse200>>;
    patchV2WebhooksWebhook_id(metadata: types.PatchV2WebhooksWebhookIdMetadataParam): Promise<FetchResponse<200, types.PatchV2WebhooksWebhookIdResponse200>>;
    /**
     * Delete a webhook
     *
     * @summary Delete a webhook
     * @throws FetchError<404, types.DeleteV2WebhooksWebhookIdResponse404> Resource with ID supplied does not exist in account and object namespace
     */
    deleteV2WebhooksWebhook_id(metadata: types.DeleteV2WebhooksWebhookIdMetadataParam): Promise<FetchResponse<number, unknown>>;
}
declare const createSDK: SDK;
export = createSDK;
