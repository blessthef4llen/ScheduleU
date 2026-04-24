import PageLayout from "@/components/ui/PageLayout";
import TravelAlertsClient from "@/components/travel/TravelAlertsClient";
import { getBaseUrl } from "@/lib/baseUrl";
import type { TravelAlert } from "@/lib/types/travelAlert";
import { TRAVEL_MOCK_ALERTS } from "@/lib/travelAlertsMock";

async function loadInitialAlerts(): Promise<TravelAlert[]> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/travel-alerts`, { next: { revalidate: 60 } });
    if (!res.ok) return TRAVEL_MOCK_ALERTS;
    const json = (await res.json()) as { alerts?: TravelAlert[] };
    return Array.isArray(json.alerts) ? json.alerts : TRAVEL_MOCK_ALERTS;
  } catch {
    return TRAVEL_MOCK_ALERTS;
  }
}

export default async function TravelAlertsPage() {
  const initialAlerts = await loadInitialAlerts();

  return (
    <PageLayout
      label="Campus mobility"
      title="Travel Alerts"
      subtitle="Shuttle status, parking, and campus mobility updates in one place—so you can plan arrivals and crossings with confidence."
    >
      <TravelAlertsClient initialAlerts={initialAlerts} />
    </PageLayout>
  );
}
