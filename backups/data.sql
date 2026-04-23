SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict ssTGrlACQpMUCOvf9kHWLK5baWOZ9j1FcC3G3PXFeydnujRFxTEjc8mAvOB7102

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."audit_log_entries" ("instance_id", "id", "payload", "created_at", "ip_address") FROM stdin;
\.


--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."custom_oauth_providers" ("id", "provider_type", "identifier", "name", "client_id", "client_secret", "acceptable_client_ids", "scopes", "pkce_enabled", "attribute_mapping", "authorization_params", "enabled", "email_optional", "issuer", "discovery_url", "skip_nonce_check", "cached_discovery", "discovery_cached_at", "authorization_url", "token_url", "userinfo_url", "jwks_uri", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."flow_state" ("id", "user_id", "auth_code", "code_challenge_method", "code_challenge", "provider_type", "provider_access_token", "provider_refresh_token", "created_at", "updated_at", "authentication_method", "auth_code_issued_at", "invite_token", "referrer", "oauth_client_state_id", "linking_target_id", "email_optional") FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") FROM stdin;
00000000-0000-0000-0000-000000000000	64a09a72-2e5e-45c3-81eb-54ecc3c576e8	authenticated	authenticated	00000000000@aguia.com	$2a$10$zp4EQYAOUYEb4efQDxXYlORYjIvLAWKGvBp9V3K8rHFyJN47EwD2C	2026-04-11 17:38:45.354074+00	\N		\N		\N			\N	2026-04-23 17:21:38.682566+00	{"provider": "email", "providers": ["email"]}	{}	\N	2026-04-11 17:33:58.328936+00	2026-04-23 17:21:38.692034+00	\N	\N			\N		0	\N		\N	f	\N	f
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") FROM stdin;
64a09a72-2e5e-45c3-81eb-54ecc3c576e8	64a09a72-2e5e-45c3-81eb-54ecc3c576e8	{"sub": "64a09a72-2e5e-45c3-81eb-54ecc3c576e8", "email": "admin@aguia.com", "email_verified": false, "phone_verified": false}	email	2026-04-11 17:33:58.339549+00	2026-04-11 17:33:58.339599+00	2026-04-11 17:33:58.339599+00	bc301369-2e58-49b8-8d70-350018c6d50d
\.


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."instances" ("id", "uuid", "raw_base_config", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_clients" ("id", "client_secret_hash", "registration_type", "redirect_uris", "grant_types", "client_name", "client_uri", "logo_uri", "created_at", "updated_at", "deleted_at", "client_type", "token_endpoint_auth_method") FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag", "oauth_client_id", "refresh_token_hmac_key", "refresh_token_counter", "scopes") FROM stdin;
701c38d6-537b-407f-9db8-9b973da70740	64a09a72-2e5e-45c3-81eb-54ecc3c576e8	2026-04-23 17:21:38.682726+00	2026-04-23 17:21:38.682726+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	200.150.70.174	\N	\N	\N	\N	\N
\.


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") FROM stdin;
701c38d6-537b-407f-9db8-9b973da70740	2026-04-23 17:21:38.695977+00	2026-04-23 17:21:38.695977+00	password	c2ecc17c-ede8-4997-abff-10e98ed66078
\.


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_factors" ("id", "user_id", "friendly_name", "factor_type", "status", "created_at", "updated_at", "secret", "phone", "last_challenged_at", "web_authn_credential", "web_authn_aaguid", "last_webauthn_challenge_data") FROM stdin;
\.


--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_challenges" ("id", "factor_id", "created_at", "verified_at", "ip_address", "otp_code", "web_authn_session_data") FROM stdin;
\.


--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_authorizations" ("id", "authorization_id", "client_id", "user_id", "redirect_uri", "scope", "state", "resource", "code_challenge", "code_challenge_method", "response_type", "status", "authorization_code", "created_at", "expires_at", "approved_at", "nonce") FROM stdin;
\.


--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_client_states" ("id", "provider_type", "code_verifier", "created_at") FROM stdin;
\.


--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_consents" ("id", "user_id", "client_id", "scopes", "granted_at", "revoked_at") FROM stdin;
\.


--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."one_time_tokens" ("id", "user_id", "token_type", "token_hash", "relates_to", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") FROM stdin;
00000000-0000-0000-0000-000000000000	23	ijab6dzqv67h	64a09a72-2e5e-45c3-81eb-54ecc3c576e8	f	2026-04-23 17:21:38.689559+00	2026-04-23 17:21:38.689559+00	\N	701c38d6-537b-407f-9db8-9b973da70740
\.


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sso_providers" ("id", "resource_id", "created_at", "updated_at", "disabled") FROM stdin;
\.


--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."saml_providers" ("id", "sso_provider_id", "entity_id", "metadata_xml", "metadata_url", "attribute_mapping", "created_at", "updated_at", "name_id_format") FROM stdin;
\.


--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."saml_relay_states" ("id", "sso_provider_id", "request_id", "for_email", "redirect_to", "created_at", "updated_at", "flow_state_id") FROM stdin;
\.


--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sso_domains" ("id", "sso_provider_id", "domain", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."webauthn_challenges" ("id", "user_id", "challenge_type", "session_data", "created_at", "expires_at") FROM stdin;
\.


--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."webauthn_credentials" ("id", "user_id", "credential_id", "public_key", "attestation_type", "aaguid", "sign_count", "transports", "backup_eligible", "backed_up", "friendly_name", "created_at", "updated_at", "last_used_at") FROM stdin;
\.


--
-- Data for Name: setores; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."setores" ("id", "nome", "tipo", "parent_id", "created_at") FROM stdin;
00000000-0000-0000-0000-000000000001	Águia Florestal S.A.	CORPORATIVO	\N	2026-04-11 14:40:58.382008+00
00000000-0000-0000-0000-000000000002	Operações Florestais	DIVISÃO	00000000-0000-0000-0000-000000000001	2026-04-11 14:40:58.382008+00
00000000-0000-0000-0000-000000000003	Colheita Mecânica	SETOR	00000000-0000-0000-0000-000000000002	2026-04-11 14:40:58.382008+00
00000000-0000-0000-0000-000000000004	Silvicultura	SETOR	00000000-0000-0000-0000-000000000002	2026-04-11 14:40:58.382008+00
00000000-0000-0000-0000-000000000005	Reflorestamento	EQUIPE	00000000-0000-0000-0000-000000000004	2026-04-11 14:40:58.382008+00
00000000-0000-0000-0000-000000000006	Administrativo	DIVISÃO	00000000-0000-0000-0000-000000000001	2026-04-11 14:40:58.382008+00
00000000-0000-0000-0000-000000000007	RH & Talentos	SETOR	00000000-0000-0000-0000-000000000006	2026-04-11 14:40:58.382008+00
00000000-0000-0000-0000-000000000008	TI & Sistemas	SETOR	00000000-0000-0000-0000-000000000006	2026-04-11 14:40:58.382008+00
\.


--
-- Data for Name: metas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."metas" ("id", "setor_id", "nome", "descricao", "unidade", "peso", "direcao", "tipo_calculo", "meta_minima", "meta_maxima", "periodicidade", "ativo", "created_at", "frequencia", "dia_lancamento", "semestre", "ativa", "ranges", "ano") FROM stdin;
a6097494-c025-4a3f-8939-2c62d70889c1	00000000-0000-0000-0000-000000000006	teste	\N		1.00	MAXIMIZAR	range	\N	\N	mensal	t	2026-04-13 17:21:06.277834+00	MENSAL	28	FEV_SET	t	[{"de": "", "ate": "", "percentual": 100}, {"de": "", "ate": "", "percentual": 80}, {"de": "", "ate": "", "percentual": 0}]	\N
\.


--
-- Data for Name: lancamentos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."lancamentos" ("id", "meta_id", "mes_referencia", "valor", "status", "observacoes", "criado_por", "aprovado_por", "data_aprovacao", "data_criacao", "updated_at") FROM stdin;
fec1238f-1807-45c2-8b8c-f0b3b4fed59f	a6097494-c025-4a3f-8939-2c62d70889c1	2025-07	1	PENDENTE	\N	00000000000@aguia.com	\N	\N	2026-04-13 17:21:55.454+00	2026-04-23 16:46:54.015974+00
\.


--
-- Data for Name: anexos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."anexos" ("id", "lancamento_id", "storage_path", "nome_arquivo", "criado_por", "created_at") FROM stdin;
\.


--
-- Data for Name: atribuicoes_lancamento; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."atribuicoes_lancamento" ("id", "meta_id", "mes_referencia", "responsavel_id", "lancador_id", "criado_em") FROM stdin;
\.


--
-- Data for Name: ciclos_ppr; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."ciclos_ppr" ("id", "semestre", "ano_inicio", "data_inicio", "data_fim", "ativo", "criado_em") FROM stdin;
1ec5b248-76d1-447e-ad98-a095fc5cbf66	FEV_SET	2025	2025-02-01	2025-09-30	t	2026-04-12 14:39:04.146736+00
\.


--
-- Data for Name: notificacoes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."notificacoes" ("id", "user_id", "tipo", "titulo", "mensagem", "lancamento_id", "meta_id", "lida", "criado_em") FROM stdin;
\.


--
-- Data for Name: papeis; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."papeis" ("id", "user_id", "setor_id", "papel") FROM stdin;
f0730d4f-22d9-4cb1-94df-0ca242b6e95f	64a09a72-2e5e-45c3-81eb-54ecc3c576e8	00000000-0000-0000-0000-000000000001	A.C
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."usuarios" ("id", "nome", "cpf", "email", "created_at") FROM stdin;
64a09a72-2e5e-45c3-81eb-54ecc3c576e8	admin	00000000000	admin@aguia.com	2026-04-11 17:33:58.328586+00
\.


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type") FROM stdin;
\.


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."buckets_analytics" ("name", "type", "format", "created_at", "updated_at", "id", "deleted_at") FROM stdin;
\.


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."objects" ("id", "bucket_id", "name", "owner", "created_at", "updated_at", "last_accessed_at", "metadata", "version", "owner_id", "user_metadata") FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."s3_multipart_uploads" ("id", "in_progress_size", "upload_signature", "bucket_id", "key", "version", "owner_id", "created_at", "user_metadata", "metadata") FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."s3_multipart_uploads_parts" ("id", "upload_id", "size", "part_number", "bucket_id", "key", "etag", "owner_id", "version", "created_at") FROM stdin;
\.


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 23, true);


--
-- PostgreSQL database dump complete
--

-- \unrestrict ssTGrlACQpMUCOvf9kHWLK5baWOZ9j1FcC3G3PXFeydnujRFxTEjc8mAvOB7102

RESET ALL;
