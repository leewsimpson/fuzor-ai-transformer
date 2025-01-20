import { onCLS, onFCP, onLCP, onTTFB, Metric } from "web-vitals"

const reportWebVitals = (onPerfEntry?: (metric: Metric) => void) => {
	if (onPerfEntry && typeof onPerfEntry === "function") {
		onCLS(onPerfEntry)
		onFCP(onPerfEntry)
		onLCP(onPerfEntry)
		onTTFB(onPerfEntry)
	}
}

export default reportWebVitals
