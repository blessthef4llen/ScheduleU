// Travelalerts page for ScheduleU.
import PageLayout from "@/components/ui/PageLayout";
import TravelAlertsClient from "@/components/travel/TravelAlertsClient";
import { TRAVEL_MOCK_ALERTS } from "@/lib/travelAlertsMock";

export default function TravelAlertsPage() {
  return (
    <PageLayout
      label="Campus mobility"
      title="Travel Alerts"
      subtitle="Shuttle status, parking, and campus mobility updates in one place—so you can plan arrivals and crossings with confidence."
    >
      <TravelAlertsClient initialAlerts={TRAVEL_MOCK_ALERTS} />
    </PageLayout>
  );
}
