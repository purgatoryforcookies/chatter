import { jwtDecode } from "jwt-decode";
import { createOidc, type Oidc } from "oidc-spa";
import { reactive, ref } from "vue";
import type { DbUser } from "../../../types";
import { tokenSchema, userSchema, type User } from "./schema";

const oidc = ref<Oidc<User>>();

export const auth = reactive<{
	loading: boolean;
	error: string | null;
	user: DbUser | null;
	token: string | null;
}>({
	loading: false,
	error: null,
	user: null,
	token: null,
});

export const useAuth = () => {
	const install = async () => {
		try {
			auth.loading = true;
			if (!oidc.value) {
				const client = await createOidc({
					issuerUri: import.meta.env.VITE_AUTH_DOMAIN,
					clientId: import.meta.env.VITE_AUTH_CLIENT_ID,
					decodedIdTokenSchema: userSchema,
					autoLogin: false,
					debugLogs: true,
				});
				oidc.value = client;
			}
		} catch (error) {
			console.error(error);
			auth.error = "Cannot use auth";
		} finally {
			auth.loading = false;
		}
	};

	const logout = () => {
		localStorage.removeItem("session_r");
		if (oidc.value?.isUserLoggedIn) {
			return oidc.value.logout({ redirectTo: "current page" });
		}
	};

	const login = () => {
		if (!oidc.value?.isUserLoggedIn) {
			return oidc.value?.login({
				doesCurrentHrefRequiresAuth: true,
			});
		}
	};

	const getAccessToken = async () => {
		try {
			if (oidc.value?.isUserLoggedIn) {
				const tokens = await oidc.value.getTokens();
				localStorage.removeItem("session_r");
				auth.token = tokens.accessToken;
				return tokens.accessToken;
			}

			if (auth.token && !isExpired(auth.token)) {
				return auth.token;
			}

			const newToken = await refreshAnonymousAccess();
			if (!newToken) {
				console.log("No token received from refresh");
				auth.error = "Cannot refresh";
				return;
			}
			auth.token = newToken;
			return newToken;
		} catch (error) {
			console.log(error);
			auth.error = "Cannot get access token";
		}
	};

	const isExpired = (token: string) => {
		const decoded = jwtDecode(token);

		if (decoded.exp && decoded.exp < new Date().getTime()) {
			return false;
		}
		return true;
	};

	const refreshAnonymousAccess = async () => {
		const refresToken = localStorage.getItem("session_r");

		if (refresToken && isExpired(refresToken)) {
			const resp = await fetch("/api/token/refresh", {
				headers: {
					authorization: `Bearer ${refresToken}`,
				},
			});

			if (resp.ok) {
				const asJson = await resp.json();
				const parsedToken = tokenSchema.parse(asJson);
				localStorage.setItem("session_r", parsedToken.refreshToken);
				return parsedToken.token;
			} else {
				localStorage.removeItem("session_r");
				window.location.reload();
			}
		}
		const newAnonAccess = await getAnonymousAccess();

		if (newAnonAccess) {
			localStorage.setItem("session_r", newAnonAccess.refreshToken);
			return newAnonAccess.token;
		}
		console.error("Cannot obtain new anonymous access");
	};

	const getAnonymousAccess = async () => {
		const tokenResponse = await fetch("/api/token", { method: "POST", body: JSON.stringify({}) });
		if (!tokenResponse.ok) {
			throw new Error(`Cannot get anonymous access ${tokenResponse.status}`);
		}
		const newAnonToken = await tokenResponse.json();
		const parsedToken = tokenSchema.parse(newAnonToken);
		return parsedToken;
	};

	const clearSession = () => {
		localStorage.removeItem("session_r");
		auth.token = null;
		auth.user = null;
		auth.error = null;
		if (oidc.value?.isUserLoggedIn) {
			oidc.value?.logout({ redirectTo: "current page" });
		}
		window.location.reload();
	};

	return {
		login,
		logout,
		getAccessToken,
		clearSession,
		install,
	};
};
