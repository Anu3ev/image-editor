// Мок для diff-match-patch
export default class MockDiffMatchPatch {
  diff_main() {
    return []
  }

  diff_cleanupEfficiency() {
    // Заглушка
  }

  diff_cleanupSemantic() {
    // Заглушка
  }

  patch_make() {
    return []
  }

  patch_apply() {
    return ['', []]
  }
}
