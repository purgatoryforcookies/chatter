import { ref, toValue } from "vue";
import { useAuth } from "./auth";

export function useFetch<T>(cb?: (data: T) => void) {
	const { getAccessToken } = useAuth();
	const data = ref<T | null>(null);
	const error = ref<string | null>(null);
	const loading = ref(false);

	const fetchData = async (url: string) => {
		data.value = null;
		error.value = null;
		loading.value = true;

		try {
			const urlValue = toValue(url);
			const accesstoken = await getAccessToken();

			if (!accesstoken) {
				error.value = "No access token!";
				return;
			}
			const resp = await fetch(urlValue, {
				headers: {
					authorization: `Bearer ${accesstoken}`,
				},
			});
			if (!resp.ok) {
				data.value = null;
				error.value = `Error - ${resp.status} - ${resp.statusText}`;
				return;
			}
			const asJson = await resp.json();

			data.value = asJson;
			if (cb) {
				cb(asJson);
			}
		} catch (err) {
			if (err instanceof Error) {
				error.value = err.message;
			} else {
				error.value = "Something went wrong";
			}
		} finally {
			loading.value = false;
		}
	};

	return { data, error, loading, fetchData };
}
