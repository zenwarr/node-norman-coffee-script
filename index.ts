import * as path from "path";
import * as norman from "node-norman";

const convertSourceMap = require("convert-source-map");


export default class CoffeeScriptPlugin {
  matches(filename: string, module: norman.ModuleInfo): boolean {
    return filename.endsWith(".coffee");
  }

  async transform(fileContent: string, sourceFilePath: string, targetFilePath: string, module: norman.ModuleInfo): Promise<norman.TransformedFile[]> {
    const cs = require("coffee-script");

    let compiled = cs.compile(fileContent, {
      inlineMap: true
    });

    // now extract source map and make it external
    let smRegexp = /(\/\/#\s+sourceMappingURL=[\s\S]+)\/\/#\s+sourceURL=coffeescript/;
    let match = smRegexp.exec(compiled);
    if (match) {
      let sm = match[1];
      let extractedSourceMap = convertSourceMap.fromComment(sm)
          .setProperty("sourceRoot", path.dirname(sourceFilePath))
          .setProperty("sources", [ path.basename(sourceFilePath) ])
          .setProperty("sourcesContent", undefined)
          .setProperty("file", path.basename(targetFilePath))
          .toJSON();

      let sourceMapFile = path.basename(targetFilePath).replace(/\.coffee$/, ".js.map");

      compiled = compiled.replace(smRegexp, "") + `//# sourceMappingURL=${sourceMapFile}`;

      return [
        {
          content: compiled,
          filename: targetFilePath.replace(/\.coffee$/, ".js")
        },
        {
          content: extractedSourceMap,
          filename: path.join(path.dirname(targetFilePath), sourceMapFile)
        }
      ];
    }

    return [
      {
        content: fileContent,
        filename: targetFilePath
      }
    ];
  }

  clean(sourceFilePath: string, targetFilePath: string) {
    return [
      targetFilePath,
      targetFilePath.replace(/\.js$/, ".js.map")
    ];
  }
}
