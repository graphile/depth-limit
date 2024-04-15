// @ts-check
import assert from "node:assert";
import { describe, it } from "node:test";
import { parseAndValidate, jsonClone } from "./utils.mjs";

/** @type {import("../dist/index.js").Options} */
const options = {
  maxListDepth: 5,
  maxDepth: 10,
  maxSelfReferentialDepth: 20,
  revealDetails: true,
};

describe("basics", () => {
  it("allows friends", () => {
    const errors = parseAndValidate(
      /* GraphQL */ `
        query FoFoFoFoF {
          currentUser {
            friends {
              name
            }
          }
        }
      `,
      options,
    );
    assert.deepEqual(jsonClone(errors), []);
  });

  it("rejects friends^3 due to maxSelfReferentialDepth", () => {
    const errors = parseAndValidate(
      /* GraphQL */ `
        query FoFoF {
          currentUser {
            friends {
              friends {
                friends {
                  name
                }
              }
            }
          }
        }
      `,
      { ...options, maxSelfReferentialDepth: 2 },
    );
    assert.deepEqual(jsonClone(errors), [
      {
        message:
          "'FoFoF' exceeds operation depth limits: " +
          "field User.friends nested 3 times which exceeds self referential maximum of 2.",
        locations: [
          {
            line: 2,
            column: 9,
          },
        ],
      },
    ]);
  });

  it("allows friends^5", () => {
    const errors = parseAndValidate(
      /* GraphQL */ `
        query FoFoFoFoF {
          currentUser {
            friends {
              friends {
                friends {
                  friends {
                    friends {
                      name
                    }
                  }
                }
              }
            }
          }
        }
      `,
      options,
    );
    assert.deepEqual(jsonClone(errors), []);
  });

  it("rejects friends^6", () => {
    const errors = parseAndValidate(
      /* GraphQL */ `
        query FoFoFoFoFoF {
          currentUser {
            friends {
              friends {
                friends {
                  friends {
                    friends {
                      friends {
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `,
      options,
    );
    assert.deepEqual(jsonClone(errors), [
      {
        message:
          "'FoFoFoFoFoF' exceeds operation depth limits: " +
          "operation list depth 6 exceeds maximum of 5.",
        locations: [
          {
            line: 2,
            column: 9,
          },
        ],
      },
    ]);
  });

  it("allows self^9", () => {
    const errors = parseAndValidate(
      /* GraphQL */ `
        query Self9 {
          currentUser {
            self {
              self {
                self {
                  self {
                    self {
                      self {
                        self {
                          self {
                            self {
                              name
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `,
      options,
    );
    assert.deepEqual(jsonClone(errors), []);
  });

  it("rejects self^10", () => {
    const errors = parseAndValidate(
      /* GraphQL */ `
        query Self10 {
          currentUser {
            self {
              self {
                self {
                  self {
                    self {
                      self {
                        self {
                          self {
                            self {
                              self {
                                name
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `,
      options,
    );
    assert.deepEqual(jsonClone(errors), [
      {
        message:
          "'Self10' exceeds operation depth limits: " +
          "operation depth 11 exceeds maximum of 10.",
        locations: [
          {
            line: 2,
            column: 9,
          },
        ],
      },
    ]);
  });

  it("rejects self>otherSelf^5", () => {
    const errors = parseAndValidate(
      /* GraphQL */ `
        query SelfOtherSelf5 {
          currentUser {
            self {
              otherSelf {
                self {
                  otherSelf {
                    self {
                      otherSelf {
                        self {
                          otherSelf {
                            self {
                              otherSelf {
                                name
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `,
      options,
    );
    assert.deepEqual(jsonClone(errors), [
      {
        message:
          "'SelfOtherSelf5' exceeds operation depth limits: " +
          "operation depth 11 exceeds maximum of 10.",
        locations: [
          {
            line: 2,
            column: 9,
          },
        ],
      },
    ]);
  });

  it("supports custom limit", () => {
    const errors = parseAndValidate(
      /* GraphQL */ `
        query FoFoFoF {
          currentUser {
            friends {
              friends {
                friends {
                  friends {
                    name
                  }
                }
              }
            }
          }
        }
      `,
      {
        ...options,
        maxDepthByFieldCoordinates: {
          // Permit friends of friends of friends, but don't allow going any deeper
          "User.friends": 3,
        },
      },
    );
    assert.deepEqual(jsonClone(errors), [
      {
        message:
          "'FoFoFoF' exceeds operation depth limits: " +
          "field User.friends nested 4 times which exceeds maximum of 3.",
        locations: [
          {
            line: 2,
            column: 9,
          },
        ],
      },
    ]);
  });
});
