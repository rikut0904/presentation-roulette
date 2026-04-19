package logic

import "testing"

func TestGetRoulette(t *testing.T) {
	cfg, err := GetRoulette()
	if err != nil {
		t.Fatalf("GetRoulette returned error: %v", err)
	}

	if len(cfg.Items) == 0 {
		t.Fatal("expected roulette items to be present")
	}
	if cfg.SpinText == "" {
		t.Fatal("expected spin text to be present")
	}
}

func TestSpinRoulette(t *testing.T) {
	cfg, err := GetRoulette()
	if err != nil {
		t.Fatalf("GetRoulette returned error: %v", err)
	}

	allowed := make(map[string]struct{}, len(cfg.Items))
	for _, item := range cfg.Items {
		allowed[item.Label] = struct{}{}
	}

	result, err := SpinRoulette()
	if err != nil {
		t.Fatalf("SpinRoulette returned error: %v", err)
	}

	if _, ok := allowed[result.Selected.Label]; !ok {
		t.Fatalf("unexpected selected label: %s", result.Selected.Label)
	}
	if result.Degrees <= 0 {
		t.Fatalf("expected positive rotation degrees, got %f", result.Degrees)
	}
}
