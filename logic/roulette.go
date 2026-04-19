package logic

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"sync"
	"time"
)

type RouletteItem struct {
	Label       string `json:"label"`
	Weight      int    `json:"weight"`
	Color       string `json:"color"`
	Description string `json:"description"`
}

type RouletteConfig struct {
	Title    string         `json:"title"`
	Lead     string         `json:"lead"`
	Items    []RouletteItem `json:"items"`
	SpinText string         `json:"spinText"`
}

type SpinResult struct {
	Selected RouletteItem `json:"selected"`
	Degrees  float64      `json:"degrees"`
}

var (
	rng = rand.New(rand.NewSource(time.Now().UnixNano()))
	mu  sync.Mutex
)

const rouletteJSON = `{
  "title": "",
  "lead": "",
  "spinText": "ルーレットを回す",
  "items": [
    {
      "label": "最近ハマっている技術",
      "weight": 3,
      "color": "#ef476f",
      "description": "最近試した技術やツールを3分で紹介する。"
    },
    {
      "label": "今週の学び",
      "weight": 4,
      "color": "#ff9f1c",
      "description": "今週得た知見を、実例つきで共有する。"
    },
    {
      "label": "失敗談",
      "weight": 2,
      "color": "#ffd166",
      "description": "やらかしたことと、そこから得た改善案を話す。"
    },
    {
      "label": "推しライブラリ",
      "weight": 3,
      "color": "#06d6a0",
      "description": "最近便利だったライブラリやパッケージを紹介する。"
    },
    {
      "label": "小ネタLT",
      "weight": 5,
      "color": "#118ab2",
      "description": "短くても面白いネタを1つ持ってくる。"
    },
    {
      "label": "未来予想",
      "weight": 1,
      "color": "#7b2cbf",
      "description": "半年後の開発やチームの変化を予想して話す。"
    }
  ]
}`

func GetRoulette() (RouletteConfig, error) {
	var cfg RouletteConfig
	if err := json.Unmarshal([]byte(rouletteJSON), &cfg); err != nil {
		return RouletteConfig{}, fmt.Errorf("failed to parse roulette config: %w", err)
	}
	return cfg, nil
}

func SpinRoulette() (SpinResult, error) {
	cfg, err := GetRoulette()
	if err != nil {
		return SpinResult{}, err
	}

	totalWeight := 0
	for _, item := range cfg.Items {
		if item.Weight > 0 {
			totalWeight += item.Weight
		}
	}
	if totalWeight == 0 {
		return SpinResult{}, fmt.Errorf("roulette items must have positive total weight")
	}

	mu.Lock()
	defer mu.Unlock()

	pick := rng.Intn(totalWeight)
	current := 0
	selectedIndex := 0
	for i, item := range cfg.Items {
		if item.Weight <= 0 {
			continue
		}
		current += item.Weight
		if pick < current {
			selectedIndex = i
			break
		}
	}

	segmentAngle := 360.0 / float64(len(cfg.Items))
	targetCenter := (float64(selectedIndex) * segmentAngle) + (segmentAngle / 2)
	jitter := rng.Float64()*(segmentAngle*0.5) - (segmentAngle * 0.25)
	degrees := 360.0*float64(5+rng.Intn(3)) + (360.0 - targetCenter) + jitter

	return SpinResult{
		Selected: cfg.Items[selectedIndex],
		Degrees:  degrees,
	}, nil
}
