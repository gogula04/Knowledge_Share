import { useCaseCards } from "@/lib/sample-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function UseCasesPage() {
  return (
    <div className="space-y-6">
      <Card className="border-border/80">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Use cases</CardTitle>
              <CardDescription>Common questions this platform is built to answer for engineering teams.</CardDescription>
            </div>
            <Badge tone="muted">{useCaseCards.length} scenarios</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {useCaseCards.map((card, index) => (
              <Card key={card.title} className="border-border/80 bg-bg/40">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge tone={index % 3 === 0 ? "default" : index % 3 === 1 ? "success" : "muted"}>Scenario {index + 1}</Badge>
                  </div>
                  <CardTitle className="text-lg">{card.title}</CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

