import React from "react";
import { Composition } from "remotion";
import { AegisCinematicShowcase } from "./compositions/AegisCinematicShowcase";
import { AegisLaunchLight } from "./compositions/AegisLaunchLight";
import { AegisLaunchTeaser } from "./compositions/AegisLaunchTeaser";
import { AegisSocialSquare } from "./compositions/AegisSocialSquare";
import { AegisLiveProductDemo } from "./compositions/AegisLiveProductDemo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="AegisCinematicShowcase"
        component={AegisCinematicShowcase}
        durationInFrames={2700}
        fps={60}
        width={1920}
        height={1080}
      />
      <Composition
        id="AegisLiveProductDemo"
        component={AegisLiveProductDemo}
        durationInFrames={4925}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="AegisLaunchLight"
        component={AegisLaunchLight}
        durationInFrames={150}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="AegisLaunchTeaser"
        component={AegisLaunchTeaser}
        durationInFrames={150}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="AegisSocialSquare"
        component={AegisSocialSquare}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1080}
      />
    </>
  );
};
