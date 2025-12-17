import { createTRPCRouter, publicProcedure } from "../../utils";

// Attack data imports
import playerAttacks from "~/lineage-json/attack-route/playerAttacks.json";
import mageBooks from "~/lineage-json/attack-route/mageBooks.json";
import mageSpells from "~/lineage-json/attack-route/mageSpells.json";
import necroBooks from "~/lineage-json/attack-route/necroBooks.json";
import necroSpells from "~/lineage-json/attack-route/necroSpells.json";
import rangerBooks from "~/lineage-json/attack-route/rangerBooks.json";
import rangerSpells from "~/lineage-json/attack-route/rangerSpells.json";
import paladinBooks from "~/lineage-json/attack-route/paladinBooks.json";
import paladinSpells from "~/lineage-json/attack-route/paladinSpells.json";
import summons from "~/lineage-json/attack-route/summons.json";

// Conditions data imports
import conditions from "~/lineage-json/conditions-route/conditions.json";
import debilitations from "~/lineage-json/conditions-route/debilitations.json";
import sanityDebuffs from "~/lineage-json/conditions-route/sanityDebuffs.json";

// Dungeon data imports
import dungeons from "~/lineage-json/dungeon-route/dungeons.json";
import specialEncounters from "~/lineage-json/dungeon-route/specialEncounters.json";

// Enemy data imports
import bosses from "~/lineage-json/enemy-route/bosses.json";
import enemies from "~/lineage-json/enemy-route/enemy.json";
import enemyAttacks from "~/lineage-json/enemy-route/enemyAttacks.json";

// Item data imports
import arrows from "~/lineage-json/item-route/arrows.json";
import bows from "~/lineage-json/item-route/bows.json";
import foci from "~/lineage-json/item-route/foci.json";
import hats from "~/lineage-json/item-route/hats.json";
import junk from "~/lineage-json/item-route/junk.json";
import melee from "~/lineage-json/item-route/melee.json";
import robes from "~/lineage-json/item-route/robes.json";
import wands from "~/lineage-json/item-route/wands.json";
import ingredients from "~/lineage-json/item-route/ingredients.json";
import storyItems from "~/lineage-json/item-route/storyItems.json";
import artifacts from "~/lineage-json/item-route/artifacts.json";
import shields from "~/lineage-json/item-route/shields.json";
import bodyArmor from "~/lineage-json/item-route/bodyArmor.json";
import helmets from "~/lineage-json/item-route/helmets.json";
import suffix from "~/lineage-json/item-route/suffix.json";
import prefix from "~/lineage-json/item-route/prefix.json";
import potions from "~/lineage-json/item-route/potions.json";
import poison from "~/lineage-json/item-route/poison.json";
import staves from "~/lineage-json/item-route/staves.json";

// Misc data imports
import activities from "~/lineage-json/misc-route/activities.json";
import investments from "~/lineage-json/misc-route/investments.json";
import jobs from "~/lineage-json/misc-route/jobs.json";
import manaOptions from "~/lineage-json/misc-route/manaOptions.json";
import otherOptions from "~/lineage-json/misc-route/otherOptions.json";
import healthOptions from "~/lineage-json/misc-route/healthOptions.json";
import sanityOptions from "~/lineage-json/misc-route/sanityOptions.json";
import pvpRewards from "~/lineage-json/misc-route/pvpRewards.json";

export const lineageJsonServiceRouter = createTRPCRouter({
  attacks: publicProcedure.query(() => {
    return {
      ok: true,
      playerAttacks,
      mageBooks,
      mageSpells,
      necroBooks,
      necroSpells,
      rangerBooks,
      rangerSpells,
      paladinBooks,
      paladinSpells,
      summons,
    };
  }),

  conditions: publicProcedure.query(() => {
    return {
      ok: true,
      conditions,
      debilitations,
      sanityDebuffs,
    };
  }),

  dungeons: publicProcedure.query(() => {
    return {
      ok: true,
      dungeons,
      specialEncounters,
    };
  }),

  enemies: publicProcedure.query(() => {
    return {
      ok: true,
      bosses,
      enemies,
      enemyAttacks,
    };
  }),

  items: publicProcedure.query(() => {
    return {
      ok: true,
      arrows,
      bows,
      foci,
      hats,
      junk,
      melee,
      robes,
      wands,
      ingredients,
      storyItems,
      artifacts,
      shields,
      bodyArmor,
      helmets,
      suffix,
      prefix,
      potions,
      poison,
      staves,
    };
  }),

  misc: publicProcedure.query(() => {
    return {
      ok: true,
      activities,
      investments,
      jobs,
      manaOptions,
      otherOptions,
      healthOptions,
      sanityOptions,
      pvpRewards,
    };
  }),
});
