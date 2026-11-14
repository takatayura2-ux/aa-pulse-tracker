import { GoogleGenAI, Type } from "@google/genai";
import { getGeminiApiKey, getGeminiModel } from "@/lib/env";
import {
  fetchAiAnalysisFromSupabase,
  saveAiAnalysisToSupabase,
} from "@/lib/supabase";
import { formatRerolls, formatValue, getDemandInfo } from "@/lib/unit-formatting";
import type { AiUnitAnalysis, AnalysisVerdict, Unit } from "@/types/unit";

function buildHeuristicAnalysis(unit: Unit): AiUnitAnalysis {
  const demandMeta = getDemandInfo(unit.demand);
  const rerollEq = formatRerolls(unit.value);
  const infoLower = unit.information.toLowerCase();

  const isLeaderboard =
    infoLower.includes("leaderboard") || infoLower.includes("less than");
  const isSecretPortal =
    infoLower.includes("secret") || infoLower.includes("portal");
  const isCapsuleOrBanner =
    infoLower.includes("capsule") ||
    infoLower.includes("banner") ||
    infoLower.includes("stars");

  const scarcityReason = isLeaderboard
    ? `Экстремально ограниченная эмиссия (${unit.information}) создаёт жёсткий дефицит предложения: большинство копий осело у коллекционеров.`
    : isSecretPortal
      ? `Секретный статус получения (${unit.information}) с низким шансом дропа ограничивает приток новых копий на рынок.`
      : isCapsuleOrBanner
        ? `Лимитированный источник получения (${unit.information}) формирует устойчивый ценовой пол после закрытия ивента.`
        : `Источник получения: ${unit.information}.`;

  const shinyReason = unit.isShiny
    ? " Shiny-вариант имеет кратный коэффициент редкости, что резко сужает ликвидность, но поднимает коллекционную премию."
    : "";

  const valueText =
    unit.value === null
      ? `Персонаж относится к ультра-редкому сегменту ${unit.subTier} без фиксированной цены (N/A) — сделки проходят индивидуально через оверпеи коллекционеров.`
      : `Текущая оценка ${formatValue(unit.value)} Value (~${rerollEq}) соответствует под-тиру ${unit.subTier}.`;

  const whyThisPrice = `${valueText} ${scarcityReason}${shinyReason}`;

  const liquidityComment =
    unit.demand >= 8
      ? `Спрос ${unit.demand}/10 (${demandMeta.label}) делает персонажа одним из самых ликвидных активов своего тира: его легко обменять на чистые апгрейды или рероллы без дисконта.`
      : unit.demand >= 5.5
        ? `Спрос ${unit.demand}/10 (${demandMeta.label}) обеспечивает стабильный поток офферов в трейдинг-хабах без необходимости сильного оверпея.`
        : `Спрос ${unit.demand}/10 (${demandMeta.label}) указывает на более нишевую ликвидность — быстрый трейд может потребовать поиска профильного коллекционера или добавления мелких аддов.`;

  const currentMeta = `${liquidityComment} В текущей мете Anime Adventures юнит класса ${unit.tier} (${unit.subTier}) ценится прежде всего за ${unit.tier === "S" || unit.tier === "New" ? "высокий торговый престиж и статус лимитированного трофея" : "доступный баланс стоимости для апгрейда портфеля и обмена на более высокие тиры"}.`;

  let verdict: AnalysisVerdict = "HOLD";
  let verdictLabel = "ДЕРЖАТЬ (HOLD)";
  let growthForecast = "";
  let confidence = 74;

  switch (unit.trend) {
    case "Rising":
      verdict = "BUY";
      verdictLabel = "ПОКУПАТЬ (BUY)";
      confidence = 84;
      growthForecast =
        "Тренд Rising сигнализирует о продолжающемся притоке покупателей. В ближайшие 2–4 недели возможен дальнейший рост при сохранении спроса выше 6/10.";
      break;
    case "Hyped":
      verdict = "BUY";
      verdictLabel = "ИМПУЛЬС / ПОКУПАТЬ";
      confidence = 78;
      growthForecast =
        "Высокий хайп (Hyped) подталкивает трейдеров к оверпеям. В краткосрочной перспективе возможен тест новых локальных максимумов, но важно отслеживать момент фиксации прибыли.";
      break;
    case "Overpriced":
      verdict = "CAUTION";
      verdictLabel = "ОСТОРОЖНО (OVERPRICED)";
      confidence = 81;
      growthForecast =
        "Статус Overpriced предупреждает о перегреве цены выше фундаментальной ценности. Покупка на пике несёт риск отката на 10–20% при следующем обновлении прайс-листа.";
      break;
    case "Declining":
      verdict = "SELL";
      verdictLabel = "ПРОДАВАТЬ / МЕНЯТЬ (SELL)";
      confidence = 82;
      growthForecast =
        "Нисходящий тренд Declining указывает на охлаждение интереса трейдеров. Рекомендуется переложить актив в более ликвидные позиции (Demand 6.5+) до дальнейшей просадки.";
      break;
    case "Unstable":
      verdict = "CAUTION";
      verdictLabel = "ВОЛАТИЛЬНОСТЬ (CAUTION)";
      confidence = 70;
      growthForecast =
        "Статус Unstable означает широкий разброс цен в реальных сделках (особенно для новых турнирных/ивентовых наград). Перед сделкой проверяйте свежие трейды и не переплачивайте без запаса.";
      break;
    case "Stable":
    default:
      verdict = unit.demand >= 6.5 ? "HOLD" : "HOLD";
      verdictLabel = "ДЕРЖАТЬ (HOLD)";
      confidence = 79;
      growthForecast =
        "Курс Stable демонстрирует равновесие спроса и предложения. Резких скачков в ближайшее время не ожидается, персонаж подходит как надёжный якорный актив для сбалансированных обменов.";
      break;
  }

  const keyDrivers: string[] = [
    `Тир ${unit.subTier} (${unit.tier} Tier)`,
    `Demand ${unit.demand}/10 · ${demandMeta.shortLabel}`,
    `Тренд: ${unit.trend}`,
    unit.isShiny ? "Shiny-модификатор редкости" : "Стандартная версия",
  ];

  return {
    whyThisPrice,
    currentMeta,
    growthForecast,
    verdict,
    verdictLabel,
    confidence,
    keyDrivers,
    source: "heuristic",
    generatedAt: new Date().toISOString(),
  };
}

function normalizeVerdict(raw: string): AnalysisVerdict {
  const upper = raw.toUpperCase();
  if (upper.includes("BUY")) return "BUY";
  if (upper.includes("SELL")) return "SELL";
  if (upper.includes("CAUTION")) return "CAUTION";
  return "HOLD";
}

export async function analyzeUnitWithGemini(
  unit: Unit,
  options?: { forceRefresh?: boolean }
): Promise<AiUnitAnalysis> {
  if (!options?.forceRefresh) {
    const cached = await fetchAiAnalysisFromSupabase(unit.slug);
    if (cached) {
      return cached;
    }
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return buildHeuristicAnalysis(unit);
  }

  const model = getGeminiModel();

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Ты — ведущий экономический аналитик рынка трейдов Roblox-игры Anime Adventures.
Проанализируй персонажа строго на русском языке, опираясь на данные официального прайс-листа:

Персонаж: ${unit.name}
Игровое имя: ${unit.gameName} | Персонаж аниме: ${unit.animeName}
Shiny-версия: ${unit.isShiny ? "Да (SHINY)" : "Нет"}
Tier: ${unit.tier} (Sub-Tier: ${unit.subTier})
Value: ${unit.value !== null ? unit.value : "N/A (коллекционная договорная цена)"}
Эквивалент в рероллах (1 RR ≈ 20 Value): ${formatRerolls(unit.value)}
Demand: ${unit.demand} / 10
Статус тренда: ${unit.trend}
Источник получения (Information): ${unit.information}

Дай чёткий, практичный, геймерско-трейдерский разбор без воды:
1) whyThisPrice: Почему у персонажа именно такая цена (2-3 предложения: редкость, тир, способ получения, shiny-фактор).
2) currentMeta: Текущая мета и ликвидность в трейдинге (2-3 предложения: насколько легко продать/обменять при текущем Demand, как воспринимается комьюнити).
3) growthForecast: Прогноз роста / рисков на ближайшие 2-4 недели с учётом тренда ${unit.trend} (2-3 предложения).
4) verdict: строго одно из BUY | HOLD | SELL | CAUTION.
5) verdictLabel: короткий заголовок вердикта по-русски (например: "ПОКУПАТЬ (BUY)" или "ДЕРЖАТЬ (HOLD)").
6) confidence: число от 55 до 95.
7) keyDrivers: массив из 3-4 коротких тегов-факторов (до 40 символов каждый).`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        temperature: 0.4,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            whyThisPrice: { type: Type.STRING },
            currentMeta: { type: Type.STRING },
            growthForecast: { type: Type.STRING },
            verdict: { type: Type.STRING },
            verdictLabel: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            keyDrivers: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: [
            "whyThisPrice",
            "currentMeta",
            "growthForecast",
            "verdict",
            "verdictLabel",
            "confidence",
            "keyDrivers",
          ],
        },
      },
    });

    const rawText = response.text?.trim();
    if (!rawText) {
      throw new Error("Empty response from Gemini");
    }

    const parsed = JSON.parse(rawText) as {
      whyThisPrice: string;
      currentMeta: string;
      growthForecast: string;
      verdict: string;
      verdictLabel: string;
      confidence: number;
      keyDrivers: string[];
    };

    const result: AiUnitAnalysis = {
      whyThisPrice: parsed.whyThisPrice,
      currentMeta: parsed.currentMeta,
      growthForecast: parsed.growthForecast,
      verdict: normalizeVerdict(parsed.verdict),
      verdictLabel: parsed.verdictLabel,
      confidence: Math.min(99, Math.max(50, Math.round(parsed.confidence || 78))),
      keyDrivers: Array.isArray(parsed.keyDrivers)
        ? parsed.keyDrivers.slice(0, 4)
        : [],
      source: "gemini",
      model,
      generatedAt: new Date().toISOString(),
    };

    await saveAiAnalysisToSupabase(unit.slug, result);
    return result;
  } catch (err) {
    console.warn("[GeminiAnalyzer] Falling back to heuristic analysis:", err);
    return buildHeuristicAnalysis(unit);
  }
}
