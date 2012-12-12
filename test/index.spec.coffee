describe 'index', ->

  mockfs  = require './mock/fs'
  process = require './mock/process'

  mocks = require 'mocks'
  {sep} = require 'path'

  yatask = mocks.loadFile "#{__dirname}/../index",
    (fs: mockfs.create(require './mock/fileSys'));
    (process: process)

  before ->
    process.chdir('/workspace/project/lib')

  it 'finds overrides from a given filename', ->
    overrides = yatask.findOverrides('package.json') ? ''
    overrides.should.equal('/workspace/project/package.json')
    null

  it 'fails to find overrides from a given filename', ->
    @expect(-> yatask.findOverrides 'nonexistent').to.throw()
    null

  null
