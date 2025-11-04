import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { LoyaltyMember } from "@/types";

interface LoyaltyCustomersProps {
  members: LoyaltyMember[];
}

export function LoyaltyCustomers({ members }: LoyaltyCustomersProps) {
  return (
    <main className="flex-1 overflow-y-auto px-6 py-6">
      <Card>
        <CardHeader>
          <CardTitle>Loyalty directory</CardTitle>
          <CardDescription>
            Customers earning points at Generic Supermarket.
          </CardDescription>
        </CardHeader>
        <CardContent className="rounded-md border p-0">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Member</th>
                <th className="px-4 py-2 font-medium">Tier</th>
                <th className="px-4 py-2 font-medium text-right">Points</th>
                <th className="px-4 py-2 font-medium">Last visit</th>
                <th className="px-4 py-2 font-medium">Phone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium">{member.name}</span>
                      <span className="text-xs text-muted-foreground">{member.id}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{member.tier}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {member.points.toLocaleString("en-DZ")}
                  </td>
                  <td className="px-4 py-3">{member.lastVisit}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {member.phone}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </main>
  );
}
