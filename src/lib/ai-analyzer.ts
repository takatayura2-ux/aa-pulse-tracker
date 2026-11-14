import { GoogleGenAI, Type } from "@google/genai";
import {
  findUnitDpsProfile,
  formatDpsNumber,
  getBestUniqueRank,
  getUniquePlacementMath,
  type UnitDpsProfile,
} from "@/data/dpsTierList";
import { getGeminiApiKey, getGeminiModel } from "@/lib/env";
import {
  fetchAiAnalysisFromSupabase,
  saveAiAnalysisToSupabase,
} from "@/lib/supabase";
import { formatRerolls, formatValue, getDemandInfo } from "@/lib/unit-formatting";
import type {
  AiUnitAnalysis,
  AnalysisVerdict,
  DpsAnalysisBreakdown,
  Unit,
} from "@/types/unit";

function buildDpsAnalysisBreakdown(
  unit: Unit,
  profile: UnitDpsProfile | null
): DpsAnalysisBreakdown {
  if (!profile) {
    return {
      combatRank: `Рыночный тир ${unit.subTier} (нет в топ-35 Update 21)`,
      uniqueEfficiency:
        "Персонаж не входит в основной топ-35 боевых уников/секреток Update 21 — тратить редкий трейт Unique (шанс 0.0951%) имеет смысл только если это ваш единственный керри для Story.",
      dpsToValueVerdict:
        unit.value !== null
          ? `При цене ${formatValue(unit.value)} Value актив оценивается рынком как ${unit.tier === "C" ? "бюджетный/стартовый" : "трейдовый"} лот, а не эндгейм DPS-инвестиция.`
          : "Коллекционная или договорная оценка без приоритета в боевой мете DPS.",
    };
  }

  const capMath = getUniquePlacementMath(profile.cap);
  const bestUniqueRank = getBestUniqueRank(profile);
  const peakNote = profile.uniquePeakDpsLv100
    ? ` (до ${formatDpsNumber(profile.uniquePeakDpsLv100)} с полной жертвой и баффами)`
    : "";

  const combatRank =
    profile.category === "collector_exclusive"
      ? `Коллекционный (Tier ${profile.tier} в бою · #${bestUniqueRank} по Unique DPS)`
      : profile.category === "summer_u21"
        ? `Update 21 Summer (${profile.tier} Tier · #${bestUniqueRank} по Unique DPS)`
        : `${profile.rankCode} (${profile.tier} Tier · #${bestUniqueRank} по Unique DPS)`;

  const isVegito = profile.name.toLowerCase().includes("fused hero");
  const uniqueEfficiency = isVegito
    ? `Исключение из правил 1-Cap: Fused Hero наследует сразу два трейта Unique от Carrot (Ultra) и Vego (Mage II), разгоняя 1 башню до ${formatDpsNumber(profile.uniqueDpsLv100)} Unique DPS на 100-м уровне (против ${formatDpsNumber(profile.divineFullCapDpsLv100)} у 3× Divine).`
    : `${capMath.headline}. 1 башня с Unique выдаёт ${formatDpsNumber(profile.uniqueDpsLv100)} DPS${peakNote} против ${formatDpsNumber(profile.divineFullCapDpsLv100)} DPS у полной команды из ${profile.cap === 1 ? "1 башни" : `${profile.cap} копий`} с Divine (${capMath.explanation})`;

  const isUntradableProfile = profile.marketValue <= 0;
  const effectiveValue =
    !isUntradableProfile
      ? unit.value !== null && unit.value > 0
        ? unit.value
        : profile.marketValue
      : profile.estimatedValue && profile.estimatedValue > 0
        ? profile.estimatedValue
        : 0;

  let dpsToValueVerdict: string;
  if (isUntradableProfile && effectiveValue > 0) {
    const ratio = Math.round(profile.uniqueDpsLv100 / effectiveValue);
    const rangeTxt = profile.estimatedValueRange ? ` (диапазон ${profile.estimatedValueRange})` : "";
    dpsToValueVerdict = `Ещё не передаётся в трейде (${profile.rarity}). Прогноз цены при открытии трейда: ~${formatValue(effectiveValue)} Value${rangeTxt} (~${formatRerolls(effectiveValue)}) — удельная отдача ~${formatDpsNumber(ratio)} DPS на 1 прогноз. Value.`;
  } else if (effectiveValue <= 0) {
    dpsToValueVerdict = `Непередаваемый юнит (${profile.rarity}): не покупается в трейде, добывается напрямую через геймплей и полностью оправдывает вложение рероллов в Unique.`;
  } else if (profile.category === "collector_exclusive") {
    const ratio = Math.round(profile.uniqueDpsLv100 / effectiveValue);
    dpsToValueVerdict = `Коллекционная премия: всего ${formatDpsNumber(profile.uniqueDpsLv100)} Unique DPS при цене ${formatValue(effectiveValue)} Value (~${ratio} DPS на 1 Value). Цена держится исключительно на дефиците старой эмиссии, а не на уроне.`;
  } else {
    const ratio = Math.round(profile.uniqueDpsLv100 / effectiveValue);
    if (effectiveValue >= 5000) {
      dpsToValueVerdict = `Трофейный перекос: ${formatDpsNumber(profile.uniqueDpsLv100)} Unique DPS (${profile.rankCode}) при цене ${formatValue(effectiveValue)} Value (~${ratio} DPS/Value). Рынок платит за легендарную редкость и 20с Timestop, а не за чистый урон.`;
    } else if (effectiveValue >= 700 && profile.uniqueDpsLv100 < 250000) {
      dpsToValueVerdict = `Саппорт/утилити-премия (${formatValue(effectiveValue)} Value, ~${ratio} DPS/Value): цена поддерживается контролем (Timestop/редкость), а не прямым DPS.`;
    } else if (ratio >= 900) {
      dpsToValueVerdict = `Сильно недооценён по DPS: ${formatDpsNumber(profile.uniqueDpsLv100)} Unique DPS за ${formatValue(effectiveValue)} Value (~${formatDpsNumber(ratio)} DPS на 1 Value) — одна из лучших покупок по соотношению «урон за цену» в мете Update 21.`;
    } else {
      dpsToValueVerdict = `Сбалансированная оценка: ${formatDpsNumber(profile.uniqueDpsLv100)} Unique DPS при ${formatValue(effectiveValue)} Value (~${formatDpsNumber(ratio)} DPS на 1 Value) соответствует текущему спросу ${unit.demand}/10.`;
    }
  }

  return {
    combatRank,
    uniqueEfficiency,
    dpsToValueVerdict,
    uniqueDpsLv100: profile.uniqueDpsLv100,
    divineFullCapDpsLv100: profile.divineFullCapDpsLv100,
    placementCap: profile.cap,
    bestUniqueRank,
  };
}

function buildHeuristicAnalysis(unit: Unit): AiUnitAnalysis {
  const dpsProfile = findUnitDpsProfile(unit);
  const dpsAnalysis = buildDpsAnalysisBreakdown(unit, dpsProfile);
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
    unit.isUntradable && unit.value !== null
      ? `Персонаж ещё не открыт для трейда (Untradable), но по аналогам своего тира его примерная оценка составляет ~${formatValue(unit.value)} Value${unit.estimatedValueRange ? ` (диапазон ${unit.estimatedValueRange})` : ""}, что эквивалентно ~${rerollEq}.`
      : unit.value === null
        ? `Персонаж относится к ультра-редкому сегменту ${unit.subTier} без фиксированной цены (N/A)${unit.estimatedValueRange ? ` — примерный ориентир договорных оферов ${unit.estimatedValueRange} Value` : " — сделки проходят индивидуально через оверпеи коллекционеров"}.`
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
    dpsProfile ? `${dpsProfile.rankCode} · ${dpsProfile.tier} Meta` : `Тир ${unit.subTier} (${unit.tier} Tier)`,
    dpsProfile
      ? `Unique: ${formatDpsNumber(dpsProfile.uniqueDpsLv100)} DPS`
      : `Demand ${unit.demand}/10 · ${demandMeta.shortLabel}`,
    `Тренд: ${unit.trend}`,
    unit.isShiny ? "Shiny-модификатор редкости" : dpsProfile ? `Cap ${dpsProfile.cap} · SPA ${dpsProfile.spa}s` : "Стандартная версия",
  ];

  return {
    whyThisPrice,
    currentMeta,
    growthForecast,
    verdict,
    verdictLabel,
    confidence,
    keyDrivers,
    dpsAnalysis,
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
  const dpsProfile = findUnitDpsProfile(unit);
  const fallbackDpsAnalysis = buildDpsAnalysisBreakdown(unit, dpsProfile);

  if (!options?.forceRefresh) {
    const cached = await fetchAiAnalysisFromSupabase(unit.slug);
    if (cached) {
      return cached.dpsAnalysis
        ? cached
        : { ...cached, dpsAnalysis: fallbackDpsAnalysis };
    }
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return buildHeuristicAnalysis(unit);
  }

  const model = getGeminiModel();
  const capMath = dpsProfile ? getUniquePlacementMath(dpsProfile.cap) : null;
  const dpsContextBlock = dpsProfile
    ? `Боевой профиль Update 21 (из базы DPS_TIER_LIST / COLLECTOR_EXCLUSIVES_DPS):
- Категория/Ранг: ${dpsProfile.rankCode} (${dpsProfile.tier} Tier, #${getBestUniqueRank(dpsProfile)} по Unique DPS)
- Редкость: ${dpsProfile.rarity} | Placement Cap: ${dpsProfile.cap} | Стоимость прокачки: ${dpsProfile.costYen}¥
- SPA: ${dpsProfile.spa}s | Range: ${dpsProfile.range} | AoE: ${dpsProfile.aoeType} | Элемент: ${dpsProfile.element} | Воздух (Air/Hybrid): ${dpsProfile.hitsAir ? "Да" : "Нет"}
- Base DPS (Lv100): ${formatDpsNumber(dpsProfile.baseDpsLv100)}
- Effective DPS (Lv100 с пассивками): ${formatDpsNumber(dpsProfile.effectiveDpsLv100)}
- Unique DPS (1 башня, Lv100): ${formatDpsNumber(dpsProfile.uniqueDpsLv100)}${dpsProfile.uniquePeakDpsLv100 ? ` (пик с жертвой/баффами: ${formatDpsNumber(dpsProfile.uniquePeakDpsLv100)})` : ""}
- Divine Full Cap DPS (все ${dpsProfile.cap} башни): ${formatDpsNumber(dpsProfile.divineFullCapDpsLv100)}
- Расчёт Placement Cap для Unique (4.444x на 1 слоте): ${capMath?.headline} — ${capMath?.explanation}
- Рыночный ориентир Value: ${dpsProfile.marketValue > 0 ? dpsProfile.marketValue : dpsProfile.estimatedValue ? `Untradable · Прогноз ~${dpsProfile.estimatedValue} Val (${dpsProfile.estimatedValueRange ?? "Est."})` : "Untradable"} | Дельта топа: ${dpsProfile.rankDelta >= 0 ? `+${dpsProfile.rankDelta}` : dpsProfile.rankDelta}
- Пассивка и роль в мете Update 21: ${dpsProfile.passiveSummary}`
    : `Боевой профиль Update 21: персонаж не входит в основной топ-35 боевых уников/секреток Update 21 (рассматривается как рыночный/стартовый актив).
Справка по математике Unique: 1-Cap = +344.4% прироста, 2-Cap = +122.2%, 3-Cap = +48.1% (+11.1% к 3× Divine), 4-Cap = лучше ставить 4× Divine (5.333x) вместо 1× Unique (4.444x) в длинных режимах.`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Ты — ведущий экономический и боевой аналитик Roblox-игры Anime Adventures (Update 21 — Heaven's Storm).
Проанализируй персонажа строго на русском языке, опираясь на данные официального прайс-листа и боевую базу DPS:

Персонаж: ${unit.name}
Игровое имя: ${unit.gameName} | Персонаж аниме: ${unit.animeName}
Статус трейда: ${unit.isUntradable ? "Ещё НЕ передаётся (Untradable, прогнозная оценка)" : "Торгуется в Trading Hub"}
Shiny-версия: ${unit.isShiny ? "Да (SHINY)" : "Нет"}
Tier: ${unit.tier} (Sub-Tier: ${unit.subTier})
Value: ${unit.value !== null ? `${unit.isEstimatedValue ? "~" : ""}${unit.value}${unit.estimatedValueRange ? ` (ориентировочный диапазон ${unit.estimatedValueRange})` : ""}` : `N/A${unit.estimatedValueRange ? ` (коллекционный ориентир ${unit.estimatedValueRange})` : " (коллекционная договорная цена)"}`}
Эквивалент в рероллах (1 RR ≈ 20 Value): ${formatRerolls(unit.value)}
Demand: ${unit.demand} / 10
Статус тренда: ${unit.trend}
Источник получения (Information): ${unit.information}

${dpsContextBlock}

Дай чёткий, практичный, геймерско-трейдерский разбор без воды:
1) whyThisPrice: Почему у персонажа именно такая цена (2-3 предложения: редкость, тир, способ получения, shiny-фактор).
2) currentMeta: Текущая мета и ликвидность в трейдинге (2-3 предложения: насколько легко продать/обменять при текущем Demand, как воспринимается комьюнити, роль в Update 21 с учётом Soaring/Burn меты).
3) growthForecast: Прогноз роста / рисков на ближайшие 2-4 недели с учётом тренда ${unit.trend} (2-3 предложения).
4) verdict: строго одно из BUY | HOLD | SELL | CAUTION.
5) verdictLabel: короткий заголовок вердикта по-русски (например: "ПОКУПАТЬ (BUY)" или "ДЕРЖАТЬ (HOLD)").
6) confidence: число от 55 до 95.
7) keyDrivers: массив из 3-4 коротких тегов-факторов (до 40 символов каждый).
8) dps_analysis: объект со следующими 3 полями:
   - combat_rank: строка (например, "T7 (S+ Tier · #7 по Unique DPS)" или "Коллекционный (Tier C в бою)")
   - unique_efficiency: 2 предложения об эффективности трейта Unique конкретно на этом юните с учётом его Spawn Cap (1-Cap = +344% прироста, 2-Cap = +122%, 3-Cap = +48%, 4-Cap = лучше 4x Divine) и реальных цифр Unique DPS vs Divine DPS.
   - dps_to_value_verdict: 2 предложения со сравнением боевого DPS и цены в трейде (выявляй недооценённых имб вроде Vengeful Swordsman / Sky Reaver, Switchblade, Chuuni, Enlightened или предупреждай, что цена держится чисто на редкости / Timestop, как у JIO Over Heaven, Time Savior, Blue Flare).`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        temperature: 0.35,
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
            dps_analysis: {
              type: Type.OBJECT,
              properties: {
                combat_rank: { type: Type.STRING },
                unique_efficiency: { type: Type.STRING },
                dps_to_value_verdict: { type: Type.STRING },
              },
              required: [
                "combat_rank",
                "unique_efficiency",
                "dps_to_value_verdict",
              ],
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
            "dps_analysis",
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
      dps_analysis?: {
        combat_rank?: string;
        unique_efficiency?: string;
        dps_to_value_verdict?: string;
      };
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
      dpsAnalysis: {
        combatRank:
          parsed.dps_analysis?.combat_rank?.trim() ||
          fallbackDpsAnalysis.combatRank,
        uniqueEfficiency:
          parsed.dps_analysis?.unique_efficiency?.trim() ||
          fallbackDpsAnalysis.uniqueEfficiency,
        dpsToValueVerdict:
          parsed.dps_analysis?.dps_to_value_verdict?.trim() ||
          fallbackDpsAnalysis.dpsToValueVerdict,
        uniqueDpsLv100: fallbackDpsAnalysis.uniqueDpsLv100,
        divineFullCapDpsLv100: fallbackDpsAnalysis.divineFullCapDpsLv100,
        placementCap: fallbackDpsAnalysis.placementCap,
        bestUniqueRank: fallbackDpsAnalysis.bestUniqueRank,
      },
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
